# Contributing to Decorix

## Setup

```sh
nvm use          # Node 22, see .nvmrc
pnpm install
```

## Quality gate

Run all of these before opening a pull request — CI enforces the same gate:

```sh
pnpm lint
pnpm typecheck
pnpm examples:typecheck
pnpm test
pnpm build
```

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

## Commit and PR conventions

- Keep commits focused; prefer several small commits over one large mixed commit.
- Describe the "why" in commit messages and PR descriptions, not just the "what".
