import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const launcherPath = join(root, 'bin/ccoa');
const launcher = readFileSync(launcherPath, 'utf8');
const mainCall = /\nmain "\$@"\s*$/;
assert.match(launcher, mainCall);
const definitions = launcher.replace(mainCall, '\n');

function withFixture(run) {
  const dir = mkdtempSync(join(tmpdir(), 'ccoa-test-'));
  try {
    const functions = join(dir, 'functions.sh');
    const fakeClaude = join(dir, 'claude');
    const capture = join(dir, 'capture.cjs');
    writeFileSync(functions, definitions);
    writeFileSync(capture, `
      const fs = require('node:fs');
      const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
        key.startsWith('ANTHROPIC_') || key.startsWith('CLAUDE_CODE_') ||
        key === 'NO_PROXY' || key === 'no_proxy'));
      console.log(JSON.stringify({ args: process.argv.slice(2), env,
        inheritedSessionFd: fs.existsSync('/proc/self/fd/8') }));
      process.exit(Number(process.env.TEST_EXIT || 0));
    `);
    writeFileSync(fakeClaude, '#!/usr/bin/env bash\nexec "$TEST_NODE" "$TEST_CAPTURE" "$@"\n');
    chmodSync(fakeClaude, 0o755);
    const env = {
      PATH: process.env.PATH,
      HOME: dir,
      TEST_NODE: process.execPath,
      TEST_CAPTURE: capture,
    };
    const shell = (code, args = [], extraEnv = {}) => spawnSync('bash', [
      '-c', 'source "$1"; shift; ' + code, 'test', functions, ...args,
    ], { env: { ...env, ...extraEnv }, encoding: 'utf8' });
    const launch = (extraEnv = {}, args = []) => shell(
      'CLAUDE_BIN="$1"; shift; launch_claude "$@"', [fakeClaude, ...args], extraEnv,
    );
    return run({ dir, shell, launch, env });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function capture(result) {
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('launcher parses as Bash', () => {
  execFileSync('bash', ['-n', launcherPath]);
});

test('Astra and medium effort are the defaults; model aliases are preserved', () => {
  withFixture(({ launch }) => {
    const { args, env } = capture(launch());
    assert.deepEqual(args, ['--permission-mode', 'auto', '--effort', 'medium']);
    assert.equal(env.ANTHROPIC_MODEL, 'gpt-6-astra[1m]');
    assert.equal(env.ANTHROPIC_CUSTOM_MODEL_OPTION_NAME, 'GPT-6 Astra');
    assert.equal(env.ANTHROPIC_DEFAULT_OPUS_MODEL, 'gpt-6-sol[1m]');
    assert.equal(env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME, 'GPT-6 Sol');
    assert.equal(env.ANTHROPIC_DEFAULT_SONNET_MODEL, 'gpt-5.6-terra[1m]');
    assert.equal(env.ANTHROPIC_DEFAULT_HAIKU_MODEL, 'gpt-6-luna[1m]');
    assert.equal(env.ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME, 'GPT-6 Luna');
    assert.equal(env.ANTHROPIC_SMALL_FAST_MODEL, 'gpt-6-luna[1m]');
    assert.equal(env.ANTHROPIC_BASE_URL, 'http://127.0.0.1:18765');
    assert.equal(env.CLAUDE_CODE_MAX_OUTPUT_TOKENS, '128000');
  });
});

test('environment overrides and user arguments survive unchanged', () => {
  withFixture(({ launch }) => {
    const custom = {
      CCOA_MODEL: 'main-model', CCOA_EFFORT: 'high',
      CCOA_OPUS_MODEL: 'opus-model', CCOA_SONNET_MODEL: 'sonnet-model',
      CCOA_HAIKU_MODEL: 'haiku-model', CCOA_CUSTOM_MODEL: 'custom-model',
      CCOA_SMALL_MODEL: 'small-model', CCOA_MAX_OUTPUT_TOKENS: '4096',
    };
    const userArgs = ['--effort', 'low', '--permission-mode', 'default', '-p', 'a prompt with spaces'];
    const { args, env } = capture(launch(custom, userArgs));
    assert.deepEqual(args, ['--permission-mode', 'auto', '--effort', 'high', ...userArgs]);
    assert.equal(env.ANTHROPIC_MODEL, 'main-model');
    assert.equal(env.ANTHROPIC_DEFAULT_OPUS_MODEL, 'opus-model');
    assert.equal(env.ANTHROPIC_DEFAULT_SONNET_MODEL, 'sonnet-model');
    assert.equal(env.ANTHROPIC_DEFAULT_HAIKU_MODEL, 'haiku-model');
    assert.equal(env.ANTHROPIC_CUSTOM_MODEL_OPTION, 'custom-model');
    assert.equal(env.ANTHROPIC_SMALL_FAST_MODEL, 'small-model');
    assert.equal(env.CLAUDE_CODE_MAX_OUTPUT_TOKENS, '4096');
  });
});

test('custom-model and Haiku overrides feed their dependent defaults', () => {
  withFixture(({ launch }) => {
    const { env } = capture(launch({ CCOA_CUSTOM_MODEL: 'custom', CCOA_HAIKU_MODEL: 'small' }));
    assert.equal(env.ANTHROPIC_MODEL, 'custom');
    assert.equal(env.ANTHROPIC_SMALL_FAST_MODEL, 'small');
  });
});

test('inherited credentials and alternate provider selectors do not bypass the proxy', () => {
  withFixture(({ launch }) => {
    const keys = [
      'ANTHROPIC_API_KEY', 'CLAUDE_CODE_USE_ANTHROPIC_AWS',
      'CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD', 'CLAUDE_CODE_USE_BEDROCK',
      'CLAUDE_CODE_USE_FOUNDRY', 'CLAUDE_CODE_USE_MANTLE', 'CLAUDE_CODE_USE_VERTEX',
    ];
    const inherited = Object.fromEntries(keys.map(key => [key, 'fixture']));
    const { env } = capture(launch({ ...inherited, NO_PROXY: 'example.test', no_proxy: 'internal.test' }));
    for (const key of keys) assert.equal(env[key], undefined, key);
    assert.equal(env.ANTHROPIC_AUTH_TOKEN, 'unused');
    assert.equal(env.NO_PROXY, '127.0.0.1,localhost,example.test,internal.test');
    assert.equal(env.no_proxy, env.NO_PROXY);
  });
});

test('Claude exit status propagates', () => {
  withFixture(({ launch }) => assert.equal(launch({ TEST_EXIT: '23' }).status, 23));
});

test('glibc gate accepts 2.39 and rejects older or unrecognized libc', () => {
  withFixture(({ shell }) => {
    for (const version of ['glibc 2.39', 'glibc 2.40', 'glibc 3.0']) {
      const result = shell('getconf() { printf "%s\\n" "$TEST_LIBC"; }; require_glibc_239', [], { TEST_LIBC: version });
      assert.equal(result.status, 0, result.stderr);
    }
    for (const version of ['glibc 2.38', 'glibc 2.9', 'musl']) {
      const result = shell('getconf() { printf "%s\\n" "$TEST_LIBC"; }; require_glibc_239', [], { TEST_LIBC: version });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /requires glibc 2\.39/);
    }
  });
});

test('non-Linux platforms fail before installing anything', () => {
  withFixture(({ shell }) => {
    const result = shell('uname() { printf "Darwin\\n"; }; main');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /supports Linux only/);
  });
});

test('proxy update is refused with an active session before stopping or downloading', () => {
  withFixture(({ shell }) => {
    const result = shell(`
      resolve_latest_proxy_release() { PROXY_VERSION=9.9.9; }
      sessions_are_active() { return 0; }
      managed_proxy_is_running() { printf 'unexpected stop check' >&2; exit 99; }
      install_latest_proxy
    `);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /another ccoa Claude session is active/);
    assert.doesNotMatch(result.stderr, /unexpected stop check/);
  });
});

test('npm archive includes only the public launcher, manifest, readme, and license', () => {
  withFixture(({ dir }) => {
    const result = execFileSync('npm', ['pack', '--dry-run', '--ignore-scripts', '--json'], {
      cwd: root,
      env: { ...process.env, npm_config_cache: join(dir, 'npm-cache'), npm_config_offline: 'true' },
      encoding: 'utf8',
    });
    const [archive] = JSON.parse(result);
    assert.deepEqual(archive.files.map(file => file.path).sort(), ['LICENSE', 'README.md', 'bin/ccoa', 'package.json']);
    assert.ok(archive.files.find(file => file.path === 'bin/ccoa').mode & 0o111);
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    assert.deepEqual(pkg.bin, { ccoa: 'bin/ccoa' });
    assert.deepEqual(pkg.os, ['linux']);
    assert.equal(pkg.dependencies, undefined);
    for (const hook of ['preinstall', 'install', 'postinstall', 'prepare']) assert.equal(pkg.scripts[hook], undefined);
  });
});
