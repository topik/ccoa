# Publishing

The source repository is https://github.com/topik/ccoa. It has independent Git
history; no company source files or credentials were imported. GitHub and npm
publication are separate. Nothing publishes to npm automatically.

## First npm release

1. Choose the npm package name. `package.json` currently uses `ccoa`; registry name
   availability is not a reservation. For a scoped name, run
   `npm pkg set name=@YOUR_NPM_USERNAME/ccoa` and update the README's `npx` examples.
   The executable remains `ccoa` regardless of the package name.
2. Review the MIT license and the complete file set before sharing it:

   ```sh
   git status --short --untracked-files=all
   npm test
   npm pack --dry-run
   ```

   The npm archive must contain exactly `LICENSE`, `README.md`, `bin/ccoa`, and
   `package.json`. The tests enforce this allowlist. Tests, publishing instructions,
   Git metadata, and CI configuration stay out of the npm archive. GitHub contains
   the files you commit, so review that file set separately. Commit and push any
   release changes before publishing.
3. Authenticate to npm interactively. Use an account with publishing permissions
   for the selected name or scope and configure the required account security:

   ```sh
   npm login
   npm whoami
   ```

4. Preview the release, then publish explicitly:

   ```sh
   npm publish --dry-run
   npm publish --access public
   ```

5. Test the published command on a supported Linux machine with Claude Code installed:

   ```sh
   npx --yes ccoa@latest
   ```

   Substitute the scoped package name if you chose one. The first run downloads
   the proxy and requests that machine's user's own ChatGPT login.

## Later model or launcher updates

1. Update defaults in `bin/ccoa`, matching tests in `test/launcher.test.mjs`, and the README.
2. Run `npm test` and `shellcheck bin/ccoa`. Test lifecycle changes on supported
   Linux systems as well; the offline tests do not perform real OAuth or proxy downloads.
3. Bump the package version, for example `npm version patch --no-git-tag-version`.
4. Review, commit, and push the changes, then publish the new npm version explicitly.

Coworkers continue using `npx --yes ccoa@latest`; there is no separate remote model
configuration to maintain. The upstream proxy release remains unpinned and updates
through the launcher's GitHub latest-release check.

## CI

The GitHub Actions workflow runs the offline tests and ShellCheck on Ubuntu 24.04.
It has read-only repository permissions and no publishing credentials. Publishing
is a separate manual action, not a side effect of pushing the repository.
