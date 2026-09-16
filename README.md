# ccoa

A Linux launcher for running an existing Claude Code installation through
[raine/claude-code-proxy](https://github.com/raine/claude-code-proxy), using your own
ChatGPT account. Defaults to **GPT-6 Astra with medium effort**.

This repository is prepared for npm publication. The commands below work after
`ccoa` is published under your npm account. If that name cannot be registered,
use a scoped package name and substitute it in the commands.

## Run

```sh
npx --yes ccoa@latest
```

Run this from the project you want Claude Code to work on, as your normal user,
not with `sudo`. The launcher passes additional arguments to Claude Code:

```sh
npx --yes ccoa@latest --continue
npx --yes ccoa@latest --effort high
```

The launcher:

1. Checks that `claude` is already installed and on `PATH`. It never installs Claude Code.
2. Resolves the newest proxy release on GitHub and verifies the downloaded archive's SHA-256.
3. Requests ChatGPT login if needed. No separate Codex CLI installation is required.
4. Starts one managed proxy per user, shared by this launcher's sessions, on `127.0.0.1:18765`.
5. Launches Claude Code with the proxy connection and model settings for that process only.

The proxy stays running after Claude Code exits. A service already using the same port
is not adopted or killed. Stop or reconfigure that service before using this launcher.

## Requirements

- Linux x86-64 or ARM64 with glibc 2.39 or newer, such as Ubuntu 24.04. Alpine/musl is not supported.
- An existing, current Claude Code installation exposing `claude` on `PATH` and supporting `--effort`.
- Node.js 20 or newer and npm for `npx`.
- Bash 4 or newer, curl, CA certificates, tar, coreutils, util-linux, awk, and procps.
- A ChatGPT account with access to the selected model through the proxy.
- Network access to npm, GitHub release assets, and the provider's authentication/API endpoints.

On Ubuntu, the system tools can be installed with:

```sh
sudo apt-get update
sudo apt-get install bash curl ca-certificates tar coreutils util-linux gawk procps libc-bin
```

You can also run the checked-out Bash script without Node or npm:

```sh
bash bin/ccoa
```

## Models and effort

| Selection | Default |
| --- | --- |
| Main session / custom model | `gpt-6-astra[1m]` |
| Opus alias | `gpt-5.6-sol[1m]` |
| Sonnet alias | `gpt-5.6-terra[1m]` |
| Haiku alias / small fast tasks | `gpt-5.6-luna[1m]` |
| Session effort | `medium` |

Override settings per invocation:

```sh
CCOA_MODEL='gpt-5.6-sol[1m]' CCOA_EFFORT=high npx --yes ccoa@latest
```

Supported overrides are `CCOA_MODEL`, `CCOA_EFFORT`, `CCOA_OPUS_MODEL`,
`CCOA_SONNET_MODEL`, `CCOA_HAIKU_MODEL`, `CCOA_CUSTOM_MODEL`, `CCOA_SMALL_MODEL`,
and `CCOA_MAX_OUTPUT_TOKENS`. Output tokens default to 128000. An explicit
`--effort` argument takes precedence over the launcher's default argument.

The `[1m]` suffix selects Claude Code's larger local context policy; it does not
increase the upstream model's actual limit. The launcher retains the conservative
272000-token auto-compaction window. Claude starts in permission mode `auto`;
an explicit `--permission-mode` argument overrides that default.

## Authentication and management

The launcher chooses browser login on graphical Linux desktops and device login
for SSH or headless sessions. Each user signs into their own account.

```sh
CCOA_AUTH_MODE=device npx --yes ccoa@latest
CCOA_AUTH_MODE=browser npx --yes ccoa@latest
npx --yes ccoa@latest --ccoa-reauth
npx --yes ccoa@latest --ccoa-stop-proxy
```

Management flags must be the first argument after the package name. Stop and
reauthentication can interrupt other sessions using the shared proxy; close those
sessions first. Reauthentication continues into a normal Claude session afterward.

## Updates

There are two independent updates:

- `npx ...@latest` resolves the latest published launcher package, including model-default changes.
- The launcher checks GitHub's latest proxy release each time it starts a normal session.

A proxy update is refused while another session started by this launcher is active.
Close those sessions and rerun. If the proxy is already current, multiple Claude
sessions can share it. An npm release does not change models in existing sessions.

Updates require network access; the launcher does not silently fall back to an
old proxy if the release check fails. Checksums detect download corruption but
are not an independent signature: the executable and checksum come from the same
upstream release.

## Local files and privacy

Default locations, with absolute XDG overrides respected:

| Contents | Location |
| --- | --- |
| Proxy executable and installation metadata | `~/.local/share/ccoa/` |
| Proxy configuration and login credentials | `~/.config/ccoa/proxy/` |
| Logs, locks, PID record, and private proxy home | `~/.local/state/ccoa/` |

Credentials are created at runtime and are not part of this repository or npm
package. The package has no npm dependencies and no install/postinstall hooks.
It does not publish or upload the current working directory. Claude Code still
sends the task context it uses through the proxy to OpenAI during normal operation.
Treat the local state and logs as private.

The proxy binds to loopback and does not authenticate local clients. Other local
processes able to reach that port can use it. This is an unofficial integration;
provider terms, quotas, and account restrictions still apply.

## Development

```sh
npm test
shellcheck bin/ccoa
npm pack --dry-run
```

Tests use a fake Claude executable and temporary directories. They verify model
and effort arguments, environment isolation, packaging, and basic platform guards
without downloading a proxy, accessing credentials, or making model requests.
They can run on macOS even though the published launcher is Linux-only.

See `PUBLISHING.md` in the repository for the first release and later updates.
