# Decorix Documentation

This directory is the narrative usage guide for Decorix: how to get started,
how to reason about the concepts, and how to wire up each target (forms, JSON
Schema, CLI). The exhaustive API reference stays in each package's README
(`packages/core/README.md`, `packages/cli/README.md`,
`packages/adapters/*/README.md`) — these guides link out to it instead of
duplicating it.

A dedicated documentation site (search, navigation) is planned for later; in
the meantime these pages are written to read directly on GitHub.

*Version française : [`docs/fr/README.md`](./fr/README.md).*

## Contents

1. [Getting Started](./getting-started.md) — install, first model, first validation.
2. [Core Concepts](./core-concepts.md) — decorators vs builder, metadata, `ValidatorAdapter`.
3. [Validation Guide](./validation-guide.md) — native constraints, custom constraints, cross-field, async, groups.
4. [Form Adapters](./adapters.md) — which package to pick for your framework.
5. [`decorix` CLI](./cli.md) — generate artifacts (JSON Schema, Zod, form configs) from the command line.
6. [JSON Schema (export/import)](./json-schema.md) — interoperability with standard schemas.
7. [Troubleshooting](./troubleshooting.md) — common errors and their cause.

For an overview of published packages, see the [root README](../README.md#packages).
