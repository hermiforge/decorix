# Contributing to Decorix

## Setup

```sh
nvm use          # Node 22, see .nvmrc
pnpm install
```

## Quality gate

Run all of these before opening a pull request, **in this order** — CI enforces the same gate:

```sh
pnpm lint
pnpm typecheck
pnpm examples:typecheck
pnpm build
pnpm verify:dist
pnpm test
```

`build` must run before `test` (the CLI's end-to-end tests resolve `@hermiforge-decorix/core` through real Node module resolution, which needs `packages/core/dist/` to exist). `verify:dist` runs right after `build`, before `test`: it imports the real built `packages/core/dist/index.js` by absolute path and exercises `validate()` against it — the only step that loads what actually gets published, since `vitest.config.ts` aliases every `@hermiforge-decorix/*` package straight to its `src/` for fast iteration. A native-constraint registry shipped empty in every published version from `0.1.0` through `0.3.1` for exactly this reason (see `ROADMAP.md`'s "Fix: Empty Native Constraint Registry in Published `core`" entry) — `pnpm test` alone cannot catch a bundling regression like that.

Also run `pnpm examples:run` after touching anything in `examples/` — it executes every example, not just typechecks it.

Fix every lint/type finding rather than disabling rules broadly. If a rule is genuinely inapplicable, disable it narrowly (inline `eslint-disable-next-line` or a scoped override in `eslint.config.mjs`) with a one-line rationale.

## Repository layout

- `packages/core` — framework-neutral metadata, decorators, builder API, validation engine.
- `packages/cli` — `@hermiforge-decorix/cli`, the `decorix` command-line tool.
- `packages/adapters/*` — one package per target framework/format (Zod, JSON Schema, Angular, React, Vue, Nest).
- `examples/*` — minimal typechecked usage examples per package, used by `pnpm examples:typecheck`.

## Adding a changeset

Decorix uses [Changesets](https://github.com/changesets/changesets) to version and publish packages. If your change affects a published package's behavior or public API, add a changeset:

```sh
pnpm changeset
```

Describe the change from a consumer's point of view; the changeset becomes part of the package's changelog.

## Releasing (manual, without CI)

GitLab (`gitlab.com/hermiforge/decorix`, remote `origin`) is the private source of truth; GitHub (`github.com/hermiforge/decorix`, remote `github`) is a public mirror that should only ever show tagged releases, not ongoing `dev` work. `.gitlab-ci.yml` has an automated `version-and-tag` job that would normally bump/tag/publish on every push to GitLab `main` (via `scripts/ci-release.mjs`) — **as of writing, that pipeline has never actually been run for a real release**, so every release so far has been cut manually instead, avoiding GitLab `main` pushes that would trigger it. Do the same until that pipeline has been verified end-to-end:

```sh
# 1. Full quality gate (see above), then:
pnpm version              # NOT `pnpm changeset version` — see pitfall below
# 2. Sync the root package.json "version" field by hand to match packages/core's
#    new version (it's "private": true, so the changesets "fixed" group skips it,
#    but scripts/tag-release.mjs reads this field to pick the git tag name)
pnpm install               # refresh the lockfile (workspace: pins changed)
pnpm build
git add -A && git commit -m "chore(release): version packages to X.Y.Z"

# 3. Tag + push to GitLab dev and GitHub main
pnpm tag:release

# 4. Sync GitLab main too (tag-release.mjs deliberately never touches it) —
#    -o ci.skip avoids triggering the untested GitLab CI pipeline
git push origin HEAD:main -o ci.skip

# 5. Publish to npm (irreversible — confirm before running)
pnpm release
```

**Pitfall**: the root `package.json` `"version"` script is `"node scripts/aggregate-root-changelog.mjs && changeset version"` — it aggregates every pending `.changeset/*.md` entry into the root `CHANGELOG.md` *before* `changeset version` consumes and deletes them. Running `pnpm changeset version` directly (instead of `pnpm version`) skips that aggregator silently: per-package changelogs still update fine, so nothing errors, but the root `CHANGELOG.md` misses a version section. If this happens, the `.changeset/*.md` source files are already gone by the time you notice — reconstruct the missing section by hand from the consumed changeset's description, matching the format already in `CHANGELOG.md`.

## Commit and PR conventions

- Keep commits focused; prefer several small commits over one large mixed commit.
- Describe the "why" in commit messages and PR descriptions, not just the "what".
