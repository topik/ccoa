# ccoa

Public Linux launcher for using an existing Claude Code installation through
raine/claude-code-proxy with a user's own ChatGPT account.

## Change boundaries

- Keep the launcher in `bin/ccoa`. npm exposes that Bash executable directly;
  a JavaScript wrapper or runtime npm dependencies need a concrete justification.
- Require an existing `claude` executable. Installing Claude Code is the user's
  responsibility; the launcher must not install it or a separate Codex CLI.
- Resolve the newest upstream proxy release rather than pinning it. Launcher
  defaults travel with the npm package, not a separate remote configuration service.
- Keep model defaults and argument handling in the launcher. When changing them,
  update the matching tests and user-facing README examples together.
- Scope connection and model settings to the launched process. Preserve the user's
  global Claude settings and explicit launcher/CLI overrides.

## Lifecycle changes

The proxy outlives individual Claude sessions. Preserve singleton ownership checks
and session locking: an update must not replace or restart the proxy beneath an
active session. Close lock descriptors in children that must not retain them.
Refuse to adopt or terminate an unrelated process using the proxy's port.

Test changes involving Linux locks, `/proc`, process identity, startup, shutdown,
or updates in disposable Linux environments. macOS syntax checks and mocked tests
cannot establish that those paths work.

## Verification

1. Run `npm test` for the offline suite, including the npm archive allowlist check.
2. Run `shellcheck bin/ccoa` after launcher changes.
3. For lifecycle changes, test real proxy startup/reuse/shutdown and blocked updates
   during active sessions on supported Linux architectures. State which were tested.

Keep routine tests offline and credential-free. Use temporary directories and
fixtures instead of the developer's login files, running proxy, or global settings.
Live provider requests are separate from the offline test suite.

## Documentation and public files

README order: prerequisites, installing the `ccoa` command, configuration, then
usage. List required software without tutorials for installing Node/npm or Claude
Code. Keep maintainer npm-publishing instructions out of the repository.

This repository is public. Include only project-owned code and documentation;
exclude company code, internal URLs, personal filesystem paths, credentials, and
local logs. Preserve the explicit npm file allowlist. GitHub contents and npm
archive contents are separate checks.

Commit, push, and publish only when requested. GitHub pushes do not publish npm
releases. Preserve existing uncommitted changes, including user-made version bumps.
