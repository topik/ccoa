# ccoa

Run Claude Code with your ChatGPT account through
[claude-code-proxy](https://github.com/raine/claude-code-proxy).
The default model is **GPT-6 Astra with medium effort**.

## Prerequisites

Have these installed before running ccoa:

- **Linux x86-64 or ARM64 with glibc 2.39+**, such as Ubuntu 24.04 or newer.
  macOS, native Windows, and Alpine are not supported.
- **Node.js 20+ with npm/npx.**
- **Current Claude Code**, with `claude` available on your `PATH`.
- **Linux tools:** Bash 4+, curl, CA certificates, tar, coreutils, util-linux,
  awk, and procps. Most standard Linux installations already include these.

You also need a ChatGPT account with access to the selected model.

## Install the `ccoa` command

```bash
npm install --global @iamtopik/ccoa@latest
```

npm installs the `ccoa` executable in its global bin directory. No manual copying
is needed. If your shell cannot find it, ensure `$(npm prefix --global)/bin` is on
your `PATH`.

You can also skip installation and use `npx --yes @iamtopik/ccoa@latest` wherever
the examples below use `ccoa`.

## Configuration

**No configuration file or API key is needed.** ccoa downloads the proxy, asks you
to sign into ChatGPT on the first run, and sets the connection and model automatically.
You do not need to install the proxy or Codex CLI yourself.

Your defaults are already set:

| Setting | Default |
| --- | --- |
| Main model | GPT-6 Astra |
| Opus alias | GPT-6 Sol |
| Sonnet alias | GPT-5.6 Terra |
| Haiku alias and small/fast model | GPT-6 Luna |
| Effort | Medium |
| Proxy | `http://127.0.0.1:18765` |

Leave port `18765` free. If you already run another proxy there, stop it before
starting ccoa. Internet access is required for downloads, login, and model requests.

## Run

Open a terminal in your project directory and run:

```bash
cd /path/to/your/project
ccoa
```

Use your normal user, **not `sudo`**. You do not need to clone this repository.

On the first run:

1. Wait for the proxy download.
2. Follow the printed ChatGPT login instructions. Desktop sessions use browser login;
   SSH and headless sessions use a device code.
3. After login, Claude Code starts in your project with Astra and medium effort.

Later runs reuse your login and the running proxy. Multiple ccoa sessions share one
managed proxy per user. The proxy stays running after you close Claude Code.

For SSH, or if browser login does not work:

```bash
CCOA_AUTH_MODE=device ccoa
```

## Optional settings

Continue your last conversation:

```bash
ccoa --continue
```

Use higher effort:

```bash
ccoa --effort high
```

Choose another model:

```bash
CCOA_MODEL='gpt-6-sol[1m]' ccoa
CCOA_MODEL='gpt-6-luna[1m]' ccoa
```

Other Claude Code arguments pass through unchanged. ccoa defaults to permission
mode `auto`; use `--permission-mode default` if you prefer the standard approval prompts.

## Stop or sign in again

Close other ccoa sessions first, because these commands affect the shared proxy.

Stop the proxy:

```bash
ccoa --ccoa-stop-proxy
```

Sign into ChatGPT again, then start Claude Code:

```bash
ccoa --ccoa-reauth
```

## Updates and common errors

To update a global installation, including its model defaults, rerun:

```bash
npm install --global @iamtopik/ccoa@latest
```

The global launcher does not update itself. Using `npx --yes @iamtopik/ccoa@latest`
instead resolves the latest launcher on each run.

With either method, ccoa checks for the latest proxy release on each normal launch.
If an update is available while another ccoa session is active, close those sessions
and retry.

| Message | Fix |
| --- | --- |
| `claude` is missing | Check that Claude Code is installed and `claude --version` works in the same terminal. |
| `node`, `npm`, or `npx` is missing | Check that Node.js 20+ and npm are installed and available on your `PATH`. |
| Unsupported platform / `EBADPLATFORM` | Run on supported Linux, not macOS or native Windows. |
| glibc is too old | Use Ubuntu 24.04+ or another distribution with glibc 2.39+. |
| Port 18765 is already in use | Stop the other service; ccoa will not adopt or kill an unrelated proxy. |
| Another ccoa session is active | Close the other ccoa sessions so the proxy can update. |

## Local files and privacy

The proxy is stored in `~/.local/share/ccoa/`, credentials in `~/.config/ccoa/proxy/`,
and logs/state in `~/.local/state/ccoa/`. Absolute XDG directory overrides are respected.
Keep credentials and logs private.

Installing ccoa does not upload your project. During use, Claude Code sends the
context it reads through the proxy to OpenAI. The proxy listens on loopback without
local client authentication, so other local processes can access it. This is an
unofficial integration, subject to the provider's terms and account limits.
