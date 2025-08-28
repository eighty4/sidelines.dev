## `pnpm dev`

`esbuild.context` and `esbuild.serve` are the backbone of the dev server.

To run the project pre-bundled and with the app's service worker, use `pnpm dev --preview`.

## Testing

Unit tests run with Node's native TypeScript support and use `node:test`. This requires a minimum Node.js verson of 24!

```shell
# run unit tests
pnpm test:unit
```

Playwright testing will start up `pnpm dev` and run all e2e tests.

```shell
# run e2e tests against the esbuild dev server
pnpm test:e2e

# run e2e tests against a pre-bundled preview build
PREVIEW=true pnpm test:e2e
```

Append `--ui` to use the Playwright UI for TDD like `pnpm test:e2e --ui`.

## Run CI checks during development

The `ci_verify.sh` script will perform all checks required by a PR and uses `pnpm` to run the project's `build`, `test` and `fmtcheck` package.json scripts.

The script has flags to create symlinks to itself in `.git/hooks`:

```bash
./ci_verify.sh --on-git-commit
./ci_verify.sh --on-git-push
```

Running either of these commands will make sure `ci_verify.sh` is ran during development.

## Formatting code

Formatting is provided by `prettier`.

```bash
# check if project is correctly formatted
pnpm fmtcheck

# format project and write to disk
pnpm fmt
```

Linting is subjectively left to personal taste after `prettier` and `tsc` run.

## Changelog notes

Document changes made by your PR in `CHANGELOG.md` under the `Unreleased` section.
