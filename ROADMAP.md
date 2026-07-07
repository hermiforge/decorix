# Decorix Validation Platform Roadmap

This file is the durable handoff state for the validation-platform refactor. Keep it updated as work moves between `TODO`, `IN_PROGRESS`, and `DONE`.

## Current Decisions

- V1 may be breaking.
- Native default validation messages are English.
- Validation issues expose stable `code`, `path`, `message`, `constraint`, and optional `params`.
- Package split remains unchanged: `@hermiforge-decorix/angular-signal`, `@hermiforge-decorix/angular-reactive`, React/Vue/Nest packages stay separate.
- No aggregate `@hermiforge-decorix/angular` package unless requested later.
- Constraint metadata moved from the old `{ kind, value, message }` union to registry-driven records: `{ name, options, message, groups }`.
- Decorator/builder compatibility preserves simple overloads such as `.required('Message')`, `@Required('Message')`, and `@MinLength(3, 'Message')`.
- Adapters with no explicit validator now use the core validator facade. An explicit missing validator name still throws the previous registry error.
- Commit after each completed implementation pass so handoffs always have a clean recorded checkpoint.
- License: LGPL-3.0-or-later (chosen over plain GPL v3 so applications that merely depend on `@hermiforge-decorix/*` are not forced into the same copyleft; modifications to Decorix itself remain copyleft).
- Hosting: GitLab (`gitlab.com/hermiforge/decorix`) is the private source of truth; GitHub (`github.com/hermiforge/decorix`) is the public mirror/showcase. `package.json` `repository`/`homepage`/`bugs` fields point to GitHub.
- **GitHub `main` mirrors releases only, not ongoing dev work.** Every commit was pushed straight to both GitLab `dev` and GitHub `main` during the initial sessions building this project — revisited once the public repo was live: a public showcase should only ever show tagged/published code, not untagged work-in-progress. Going forward, ordinary work only goes to GitLab `dev`; GitHub `main` is updated exclusively by an actual release (the GitLab CI `version-and-tag` job, or a manual `pnpm tag:release`), never by a routine `git push github`.
- Release automation lives in GitLab CI (`.gitlab-ci.yml`), not GitHub Actions, since merges to `main` happen on GitLab (the source of truth): merging `dev` → `main` automatically bumps versions from pending changesets, tags, and pushes to GitLab `main`/`dev` and GitHub `main`. The actual `npm publish` step stays a manual "play" button in the GitLab pipeline (irreversible, so never automatic). `pnpm changeset` (creating a changeset) and `pnpm tag:release` (ad hoc local tag/push) remain available for manual use alongside the pipeline.
- Internal workspace dependencies use pinned `workspace:0.1.0` (not `workspace:*`/`workspace:^`). This only stays safe if version bumps always go through `pnpm changeset` + `pnpm version` (which rewrites all internal `workspace:` refs together, per `.changeset/config.json`'s `fixed`/`updateInternalDependencies: "patch"`) — never bump a package version by hand.
- **Never register anything through a bare side-effect import of an internal module that exports nothing** (`import './some-module'` with no bindings used) — a bundler's tree-shaking eliminates that module entirely if it can't see any of its exports used, side effects included, as long as the module isn't the entry point itself. `packages/core/package.json`'s `"sideEffects": false` (copied onto all 15 packages, see the Public v1 Pre-Release Checklist entry below) made this concrete: it shipped an empty native-constraint registry in every published version through `0.3.1`. If a module-level side effect is ever required again (registries, polyfills, ...), call it directly in the entry module (`index.ts`) itself, whose top-level code no bundler ever removes — never hide it inside an otherwise-unused imported file. `packages/core/package.json`'s `"sideEffects"` field is now the built entry files (`./dist/index.js`, `./dist/index.cjs`) rather than `false`, as accurate metadata for downstream consumers' own bundlers, but that field alone does **not** protect a package's *own* build (verified: changing it had zero effect until the call itself moved into `index.ts`) — the code-level fix is what actually matters.

## Documentation and Constraint Coverage Standard

- Every exported type, interface, class, function, decorator, builder, adapter, and public helper must have TsDoc that explains its role and parameters when applicable.
- Important internal helpers that perform validation, constraint conversion, registry lookup, traversal, or issue normalization must also have TsDoc or a nearby explanatory comment.
- Non-trivial branches, fallback paths, framework limitations, constraint conversions, and async/sync validation boundaries need line comments that explain why the branch exists.
- Custom validation fallback logic must never be uncommented.
- No adapter may ignore a core constraint. If the target framework cannot express a constraint natively, the adapter must preserve it in descriptors or schema metadata and enforce it through Decorix custom/core validation where the framework allows runtime validation.
- Sync-only adapter paths must fail clearly when they encounter async constraints, unless the framework-specific integration exposes an async validation path.

## Quality Gate (run every pass)

- Before committing any implementation pass, run and pass all of: `pnpm lint` (ESLint + SonarJS), `pnpm typecheck` (strict flags), `pnpm examples:typecheck`, `pnpm build`, `pnpm verify:dist`, and `pnpm test`, **in that order** — `packages/cli/test/cli-e2e.test.ts` loads real on-disk fixtures via tsx's own Node module resolution (not Vitest's aliases), which needs `packages/core/dist/` to exist to resolve `@hermiforge-decorix/core`. Running `test` before `build` fails those tests with `Cannot find module ... dist/index.js` (discovered via a fresh CI checkout, masked locally by leftover `dist/` from prior builds).
- `pnpm verify:dist` (`scripts/verify-dist.mjs`) imports the real built `packages/core/dist/index.js` **by absolute file path** and exercises `validate()` against native constraints — the only step in the gate that actually loads what gets published. `vitest.config.ts` aliases every `@hermiforge-decorix/*` package straight to its `src/` for fast iteration, so `pnpm test` never catches a bundling/tree-shaking regression in the built output; this is why the native-constraint-registry incident below shipped in every published version of `core` through `0.3.1` without a single test failing. Run it after `build`, before `test`.
- Fix every lint/type finding. If a rule is genuinely inapplicable, disable it narrowly (inline `eslint-disable-next-line` or a scoped override in `eslint.config.mjs`) with a one-line rationale — never silence findings broadly or leave them unresolved.
- CI enforces `lint`, `typecheck`, `build`, `verify:dist`, then `test` (see `.github/workflows/ci.yml`) — build must precede test; keep the tree green so every handoff is a clean checkpoint.
- `pnpm examples:run` actually executes every example (not just typechecks it) — run it after touching anything in `examples/` to confirm the printed output still shows real validation results, not just a clean compile.

## IN_PROGRESS

- No active item at the end of this implementation pass.

## TODO

Backlog post-v1 (deliberately deferred, decided during the pre-v1 code/security/completeness audit — not blocking the first public release):

- **Value coercion/transformation.** Decorix is a pure validator (see README "Positioning" section) — no automatic trimming, no string→number coercion, no date parsing. Revisit only if there's real demand; would need a new pipeline stage distinct from validation.
- **`Infer<T>` for builder-declared models.** The decorated-class path now infers `T` for free (the class itself already has the right shape — see the "Type Inference for Decorated Classes" DONE entry below), but `model()`/`stringField()`/etc. (`packages/core/src/builder/field-builders.ts`) have no generic building blocks today — every `FieldBuilder` is non-generic, so `stringField().optional()` and `stringField().required()` have the same TS type, and `enumField(['a','b'])` isn't `EnumFieldBuilder<'a'|'b'>`. A Zod-style `Infer<typeof someModel>` would need each builder class to carry a phantom output type end-to-end (`StringFieldBuilder<T = string>`, `.optional(): FieldBuilder<T | undefined>`, `objectField<Shape>(fields): FieldBuilder<Infer<Shape>>`, ...) and `model()` to expose that shape — a much larger, distinct rewrite than the decorated-class fix, not attempted here.

## DONE

### Type Inference for Decorated Classes (`ModelTarget<T>`)

Two concrete pains reported by a user, both traced to the same root cause: `@hermiforge-decorix/react-hook-form` forced writing a separate `type SignupFormValues = {...}` and casting `configForm.defaultValues as SignupFormValues`/`configForm.resolver as Resolver<SignupFormValues>`; `@hermiforge-decorix/angular-signal` forced `type SignupModel = Pick<SignupDto, keyof SignupDto>` plus an explicit `toSignalForm<SignupModel>(SignupDto, ...)`, since `TModel extends Record<string, unknown>` structurally rejects a plain class/interface (no index signature).

Root cause: `ModelTarget` (`packages/core/src/metadata/types.ts`) was `= Function`, with no generic parameter — even though a decorated class (`@Model('X') class X {...}`) already has, natively, exactly the shape needed (`InstanceType<typeof X>`). Nothing connected that already-available type to what adapters returned.

An audit of all 11 model-consuming packages (Explore agent, read-only) found this was systemic, not isolated: 10 of 11 weren't generic on the model type **at all** (worse than `angular-signal`, which at least had an unlinked `TModel`), only `json-schema` was legitimately exempt (its output is a JSON Schema document, not a TS-shaped value).

**Fix** (core + all 12 affected packages, one pass, confirmed with the user after the audit):

- **`packages/core/src/metadata/types.ts`**: `ModelTarget<T = unknown> = abstract new (...args: any[]) => T` (was `= Function`). Purely additive — `T` defaults to `unknown`, so every existing bare `ModelTarget` reference (registry internals, not-yet-updated code) keeps compiling unchanged.
- **`packages/core/src/validation/engine.ts`**: `validate`/`validateAsync` gained an overload — `validate<T>(value: unknown, model: ModelTarget<T>, options?): ValidationResult<T>` — so `validate(untypedPayload, SignupDto)` infers `ValidationResult<SignupDto>` directly, independent of any adapter.
- **The mechanical pattern applied to `react-hook-form`, `react-tanstack-form`, `vue-vee-validate`, `vue-formkit`, `svelte-felte`, `solid-felte`, `solid-modular-forms`, `nest`**: `DecorixXxxModel<T = Record<string, unknown>> = ModelTarget<T> | ModelMetadata`; every config field that represented model data (`defaultValues`/`initialValues`/`initialValue`, `resolver`/`validate`/`validateAsync`/`transform`) changed from `Record<string, unknown>`/`unknown` to `T`/`Partial<T>`; runtime bodies unchanged (a boundary cast, since the schema is still built dynamically from runtime `FieldMetadata` — Decorix's type system has no field-by-field mapping back to a static `T` to derive this mechanically, same reasoning as the locale/i18n and Superforms passes).
- **`angular-signal`**: same pattern, but `toSignalForm<TModel>`'s `extends Record<string, unknown>` constraint (which rejected classes, forcing the `Pick<T, keyof T>` workaround) was removed; internally normalizes through an identity mapped type (`type Normalize<T> = {[K in keyof T]: T[K]}`) right before calling Angular's real `form()`/`SchemaPathTree<T>` (which does require that mapped shape), then casts the result back to `FieldTree<TModel>` at the return boundary — the constraint moved from the public API (where it broke class inference) to an internal implementation detail.
- **`angular-reactive`**: added a *second*, independent generic (`TModel`) alongside the pre-existing `TValidationMode` (which controls only the shape of the returned validators — `'angular' | 'descriptors' | 'both'`, via 3 existing overloads). Both generics threaded through all 3 overloads without conflating them.
- **`svelte-superforms`**: hit the exact same class-doesn't-satisfy-`Record<string,unknown>` problem as `angular-signal` (Superforms' own generic constraints require the same mapped shape) — same `Normalize<T>` fix, applied to the returned `ValidationAdapter<Normalize<T>>`.
- **`zod`**: `toZod<T>(modelOrMetadata): z.ZodType<T>` (was `z.ZodObject<Record<string, z.ZodTypeAny>>`, unparameterized) — the Zod schema is still built dynamically from `FieldMetadata` field-by-field, so there's no static derivation from `T`; the return is cast at the boundary (a documented trust assertion), but this immediately makes `z.infer<ReturnType<typeof toZod<SignupDto>>>` resolve to `SignupDto`, the standard Zod idiom, without reinventing anything.
- **`json-schema`**: deliberately untouched — see the audit's category (D) reasoning above.
- Type-level proof tests added (not just runtime behavior) in `core`, `react-hook-form`, `angular-signal`, and `zod` — a typed variable assignment or `z.infer` usage that would fail to compile if inference broke, reproducing the exact two user-reported scenarios end-to-end. `examples/react-hook-form/class-model.ts` and `examples/angular-signal/class-model.ts` rewritten the same way (the latter dropping its `RegisterUserModel`/`Pick<T, keyof T>` type entirely).
- One shared changeset (`model-target-type-inference.md`, `minor` on all 13 packages) — every generic defaults to `Record<string, unknown>`, so this is non-breaking for every existing call site.

See the TODO section above for why builder-declared models (`model()`/`stringField()`) don't get the same inference in this pass.

Full quality gate green: `pnpm lint`, `pnpm typecheck` (15 packages), `pnpm examples:typecheck`, `pnpm build`, `pnpm verify:dist`, `pnpm test`, `pnpm examples:run`.

### Fix: Empty Native Constraint Registry in Published `core`

A `react-hook-form` user reported that validation never produced any errors, even on an empty form submission. Root-caused (confirmed by downloading and inspecting the real npm tarballs of every published `@hermiforge-decorix/core` version) to a bug present in **every release since `0.1.0`, not a regression**:

- `packages/core/src/index.ts` registered ~45 native constraints (`required`, `minLength`, `email`, ...) via `import './validation/native-constraints';` — a bare import with no exports used. `native-constraints.ts` itself called `registerNativeConstraints()` at its own top level to populate the shared `defaultConstraintRegistry` (`constraint-registry.ts`), a real, necessary side effect.
- rolldown/tsdown's tree-shaking eliminated the entire `native-constraints.ts` module from `dist/index.js`/`dist/index.cjs` in every published version — confirmed empirically: `grep -c registerNativeConstraints`/`EMAIL_REGEXP` returned 0 in the 0.1.0, 0.2.0, 0.2.1, 0.3.0, and 0.3.1 tarballs.
- Consequence: every call to `validate()`/`validateAsync()` against a native constraint threw `No Decorix constraint registered for "..."` (`issue-utils.ts`'s `resolveConstraintDefinition`). React Hook Form's `resolver` (`packages/adapters/react-hook-form/src/adapter.ts`) has no `try/catch` around this, so the promise rejected and React Hook Form silently swallowed it rather than populating `formState.errors` — validation appeared to just never fire.
- **Why the Quality Gate never caught it**: `vitest.config.ts` aliases every `@hermiforge-decorix/*` package straight to its `src/`, so `pnpm test` never loads the actual built `dist/` — even though `build` runs before `test` in the gate, nothing downstream consumed its output to verify correctness.

Fix (see the new "Current Decisions" bullet above for the general lesson):
- Moved `registerNativeConstraints()` out of `native-constraints.ts`'s own top level and into `index.ts` (the entry module) itself, calling the now-exported function directly. Entry-module top-level code is never eliminated by a bundler, unlike a bare import of an otherwise-unused internal file — this is what actually fixed it (verified: changing only `package.json`'s `"sideEffects"` field first, without this code change, had **zero** effect on the built output).
- `packages/core/package.json`'s `"sideEffects": false` → `["./dist/index.js", "./dist/index.cjs"]`, as accurate metadata for downstream consumers' own bundlers (tsdown bundles everything into these two files, so this is the correct set to mark as impure) — kept alongside the code fix, not instead of it.
- **New `scripts/verify-dist.mjs`** + root script `pnpm verify:dist`: dynamically imports `packages/core/dist/index.js` by absolute file path (never by package name/alias, guaranteeing it's the real built artifact) and calls `validate()` against a model with a native `required`/`minLength` constraint, asserting real issues come back instead of a thrown error. Wired into the Quality Gate (root `package.json`, `.gitlab-ci.yml`, `.github/workflows/ci.yml`) right after `build`, before `test` — the only step that can catch this bug class going forward. Verified it fails against the pre-fix `dist/` and passes after the fix, reproducing then resolving the reported bug end-to-end.
- Audited all 15 packages for the same pattern (bare side-effect import from an entry `index.ts`): `core` was the only one with it — no other package is currently at risk, though the `"sideEffects": false` on all 14 others remains a latent trap if one is ever introduced.
- New changeset `core-native-constraints-registry.md` (`@hermiforge-decorix/core`: patch).

Full quality gate green: `pnpm lint`, `pnpm typecheck` (15 packages), `pnpm examples:typecheck`, `pnpm build`, `pnpm verify:dist` (new), `pnpm test` (266 tests), `pnpm examples:run` (33 examples).

### Aggregated Root `CHANGELOG.md`

Each `@hermiforge-decorix/*` package already got its own `changeset`-generated `CHANGELOG.md`, but with 15 packages in a single `fixed` version group, there was no one place to read "what changed in this release" without opening every package's file. Added a root `CHANGELOG.md` that aggregates every release's entries in one place.

- **New `scripts/aggregate-root-changelog.mjs`**: reads pending `.changeset/*.md` files directly (not the per-package `CHANGELOG.md` files `changeset version` generates), since the changeset source files are one entry per logical change regardless of how many packages they bump — no dedup logic needed, unlike parsing the generated per-package changelogs where the same entry text is duplicated across every affected package plus "Updated dependencies" noise from the `fixed` group. Computes the next version itself (mirrors changesets' own fixed-group semver-bump logic: highest bump level across all pending changesets, applied to `packages/core/package.json`'s current version) and prepends a `## <version>` section, grouped into `### Major/Minor/Patch Changes`, to `CHANGELOG.md`.
- Must run **before** `pnpm changeset version` (which deletes the `.changeset/*.md` files it reads) — wired into the root `package.json`'s `version` script (`node scripts/aggregate-root-changelog.mjs && changeset version`) and into `scripts/ci-release.mjs` (now calls `pnpm version` instead of `pnpm changeset version` directly), so both the manual and CI release paths share one source of truth and neither can drift out of sync with the other.
- Backfilled `CHANGELOG.md` with the 4 releases that already have complete changeset-derived history in the per-package `CHANGELOG.md` files (0.2.0, 0.2.1, 0.3.0, 0.3.1) by hand, deduplicating entries the same way the script does going forward. `0.1.0` predates the changesets tooling entirely — every per-package `CHANGELOG.md` already stops at `0.2.0` with no `0.1.0`/`0.1.1` section to backfill from, so `0.1.0` only gets a one-line pointer to `ROADMAP.md`'s `DONE` history instead of a fabricated entry.
- Verified with a throwaway test changeset (`.changeset/_test-aggregate.md`, deleted after) before writing the real backfill, confirming the script computes the right next version and section shape without needing a real pending release.

### Svelte and SolidJS Adapters

Closed the "Svelte and SolidJS adapters" TODO item. Only Angular, React, Vue, and Nest had adapters before this pass; the user chose double coverage for both new frameworks, matching the existing React (Hook Form + TanStack Form) and Vue (VeeValidate + FormKit) pattern — 4 new packages total, all under `packages/adapters/`, all consuming only `@hermiforge-decorix/core` (plus `@hermiforge-decorix/json-schema` for one of them).

Library choice was driven by real Context7/npm verification, not assumption — the exact failure mode the v0.1.1 incident (4 broken adapters) warned against:
- **`solid-forms`** (the originally obvious "SolidJS forms library" choice) had essentially no reliable Context7 documentation coverage — replaced with **Felte** (`@felte/solid`), which supports Svelte/Solid/React natively with solid documentation, confirmed by inspecting its real `@felte/common` type declarations (`ValidationFunction<Data> = (values) => AssignableErrors | undefined | Promise<...>`).
- **Superforms** (`sveltekit-superforms`) turned out to be **SvelteKit-only**, not plain-Svelte, and to require implementing its own `ValidationAdapter<Out, In>` contract (the same shape its built-in `zod()`/`valibot()` helpers return) rather than the passive "config object" pattern every other UI adapter uses — confirmed by downloading and reading the actual installed package's `dist/adapters/*.d.ts`/`.js` (not just Context7 docs). Its own derivation helpers (`createAdapter`, `constraints()`, `schemaShape()`, `defaultValues()`) are **not** part of `sveltekit-superforms/adapters`'s public API (only re-exported as types, not functions) — verified directly against `dist/adapters/index.js` — so `packages/adapters/svelte-superforms/src/defaults.ts` and `src/shape.ts` reimplement the equivalent `defaults`/`constraints`/`shape` fields directly from Decorix `FieldMetadata` instead of relying on an unsupported deep import.

- **`packages/adapters/svelte-felte`** (`felte`) and **`packages/adapters/solid-felte`** (`@felte/solid`): passive config-shaped adapters (`toFelteForm`/`useFelteDecorix`), same family as FormKit/React Hook Form — never call `createForm` themselves, just produce `initialValues`/`validate`/`validateAsync` matching Felte's `ValidationFunction` contract (`Record<string, string | string[]>` errors, one entry kept per constraint since Felte accepts multiple messages per field, unlike React Hook Form's single-error convention). Real, non-mocked `createForm`/`@felte/solid`'s `createForm` calls are exercised in each package's tests; Felte's `createForm` needs an active Svelte/Solid component-style reactive context for full read-after-write assertions on `errors` (`onDestroy` throws for Svelte outside a component; Solid's signal updates need the exact rendering owner), so each test suite instead asserts the adapter's own output shape exhaustively and confirms the real `createForm` accepts that output without throwing — the same class of constraint already documented for `angular-signal`'s `form()`.
- **`packages/adapters/solid-modular-forms`** (`@modular-forms/solid`): also config-shaped (`toModularForm`/`useModularFormDecorix`), using Modular Forms' whole-form `FormOptions.validate: ValidateForm` option (confirmed via Context7 and the installed package's `dist/types/types/form.d.ts`) rather than per-field `custom()` validators — simpler and avoids re-deriving per-constraint validator functions. Its `FormErrors` type keys by each field's **full dot-path** (`address.city`, not just `address`), unlike `groupIssuesByField`'s first-path-segment grouping, so `src/errors.ts` builds that mapping directly from `ValidationIssue.path.join('.')`. `@modular-forms/solid`'s `createForm` calls a client-only Solid API even at plain construction time (throws under Node without a DOM) — confirmed by trying it — so its test verifies the adapter's `validate`/`FormErrors` contract against the real, installed package's type declarations instead of a live `createForm` call.
- **`packages/adapters/svelte-superforms`** (`sveltekit-superforms`): `createSuperformsValidatorAdapter` builds a full `ValidationAdapter<Record<string, unknown>>` by hand — `superFormValidationLibrary: 'custom'`, `validate` (delegating to Decorix core/`resolveSchema`+`runSchemaAsync`), `jsonSchema` (reusing `@hermiforge-decorix/json-schema`'s `toJsonSchema`, a genuine cross-package reuse point), and hand-built `defaults`/`constraints`/`shape`/`id` derived directly from `ModelMetadata`/`FieldMetadata` (type-appropriate defaults — `''`/`0`/`false`/first-enum-value/`[]`, not `undefined`, since Superforms' bound inputs need concrete values). Tested against the real `superValidate()` from `sveltekit-superforms/server` (not the root `sveltekit-superforms` export, which pulls in a `.svelte` file — `SuperDebug.svelte` — through its client re-exports and breaks under plain Vitest without a Svelte-aware loader).

All 4 packages: real, pinned `devDependencies` + optional `peerDependencies` on their target libraries (verified real API surface, not assumed); `examples/<pkg>/{class-model,builder-model}.ts` (the `svelte-superforms` examples call `adapter.validate()` directly rather than importing `sveltekit-superforms/server`, since that library is a peer of the adapter package, not of `examples/`, which has no per-package `node_modules` isolation to resolve it from); READMEs documenting the Known Limitations above; `docs/adapters.md` + `docs/fr/adapters.md` decision table and limitations sections extended; monorepo integration (`tsconfig.base.json` paths, `vitest.config.ts` aliases, `tsdown.config.ts` `neverBundle`) for each package. CLI support (`packages/cli/src/generators.ts` + `cli.ts` commands for these 4 adapters) is explicitly deferred to a later pass, matching the existing `renderXxxModule` + `cac` command pattern already used for the other 9 adapters.

Full quality gate green: `pnpm lint`, `pnpm typecheck` (15 packages), `pnpm examples:typecheck`, `pnpm build` (15 packages), `pnpm test` (266 tests, up from 231), `pnpm examples:run` (33 examples, up from 25).

### i18n/locale for Native Messages

Closed the "i18n/locale for native messages" TODO item. `ValidationContext.locale`/`ValidationOptions.locale` already propagated to every constraint context, but `messageForConstraint()` (`packages/core/src/validation/issue-utils.ts`) never read `context.locale` — every native message stayed hardcoded English.

- **New `packages/core/src/validation/locale-registry.ts`**: `LocaleRegistry` (a `Map<locale, Map<constraintName, LocaleMessage>>`), the process-wide `defaultLocaleRegistry` singleton, and `registerLocale`/`getLocaleMessage` helpers — pattern deliberately mirrors `constraint-registry.ts`, with one documented difference: `register()` merges into an existing locale bucket instead of throwing on a duplicate `(locale, name)`, since a locale dictionary is expected to be assembled incrementally (base dictionary + app-specific overrides), unlike a constraint definition which is only ever declared once. `LocaleMessage<TOptions>` mirrors `ConstraintDefinition.message`'s shape (`string | ((options, context) => string)`) so parameterized native messages (e.g. `minLength`) can be translated with the same `options` access. Locale tags are matched verbatim — no `fr-FR` → `fr` normalization/fallback, by design (a consumer that wants that behavior registers both tags or normalizes before calling `validate`).
- **`messageForConstraint`** (`issue-utils.ts`) gained an optional trailing `localeRegistry` parameter (default `defaultLocaleRegistry`): when `context.locale` is set and a translation exists for `(locale, definition.name)`, it wins; otherwise silent fallback to the existing English default/message-factory behavior — never throws for an unknown locale/constraint pair. **`normalizeConstraintIssue`** got the same optional trailing parameter, threaded through to its internal `messageForConstraint` call. Both changes are purely additive (new optional parameters with defaults at the end of an existing public signature), verified against every existing call site (`engine.ts`'s `runConstraintSync`/`runConstraintAsync`, plus the Zod, Angular Reactive, and Angular Signal adapters, which all call `normalizeConstraintIssue` positionally with 4-5 args) — none needed changes beyond `engine.ts` itself.
- **`ValidationOptions`** (`engine.ts`) gained `localeRegistry?: LocaleRegistry`, resolved as `options.localeRegistry ?? defaultLocaleRegistry` at the two constraint-execution call sites (`runConstraintSync`/`runConstraintAsync`) — no other threading needed since `options` already flows unchanged through the whole traversal (`validateModelSync/Async` → `validateFieldSync/Async` → `validateChildrenSync/Async` → `validateObjectConstraintsSync/Async`).
- The override priority chain is unchanged and still enforced first: `constraint.message` (explicit `.required('Message')`/`@Required('Message')`) always wins over any locale translation, which itself takes priority over the definition's own default message — verified by a dedicated test in the new `packages/core/test/locale.test.ts`.
- **Explicit scope decision**: Decorix ships the registration mechanism only, no bundled translation dictionary (not even a complete French one, despite `docs/fr/` already existing) — mirrors the "Value coercion" TODO's own "revisit only if there's real demand" philosophy. Maintaining a full translated dictionary for every native constraint would create an ongoing maintenance burden (every new native constraint would need simultaneous translation, on pain of silent EN/FR drift) and an arbitrary precedent (why French and not Spanish/German/...). Documented as a deliberate constraint, not an oversight, in both the new "Locale / i18n" section of `packages/core/README.md` and the "Localizing native messages" section added to `docs/validation-guide.md` (+ `docs/fr/validation-guide.md` mirror), each with a minimal illustrative example (`required`, `minLength`, `email`, `min`) rather than a claim of exhaustive coverage.
- New `packages/core/test/locale.test.ts` (kept separate from `core.test.ts`'s native-constraint `it.each` table, since locale is an orthogonal cross-cutting concern, not one more native constraint case): covers the English fallback with no locale set, fallback when the locale has no translation for the constraint, a matching translation being used, a parameterized factory-based translation, the explicit user-message override always winning, and an isolated `LocaleRegistry` (passed via `ValidationOptions.localeRegistry`) staying scoped away from the process-wide registry.

Full quality gate green: `pnpm lint`, `pnpm typecheck` (11 packages), `pnpm examples:typecheck`, `pnpm build`, `pnpm test` (231 tests, up from 224), `pnpm examples:run` (25 examples, no output regressions).

### `docs/` Usage Guide

Replaced the placeholder `docs/README.md` (a one-paragraph stub pointing back
to the root README) with a real narrative usage guide, since package READMEs
only cover installation/API reference per package, not a cross-package
walkthrough. Decision: plain Markdown under `docs/`, versioned with the code,
readable directly on GitHub with no build step — a dedicated doc site
(Docusaurus/Starlight + GitHub Pages) is deliberately deferred to later.

- Added `docs/getting-started.md`, `docs/core-concepts.md` (decorators vs
  builder, metadata, `ValidatorAdapter`), `docs/validation-guide.md` (native
  constraints, cross-field/object, custom constraints, async, groups, nested
  objects/arrays), `docs/adapters.md` (decision table + known per-adapter
  limitations), `docs/cli.md`, `docs/json-schema.md`, and
  `docs/troubleshooting.md` — all in English, matching the rest of the repo
  (root README, package READMEs, CONTRIBUTING.md).
- Added a French mirror under `docs/fr/` (same 8 files) since the guide was
  first drafted in French; kept both rather than dropping one, at the cost of
  needing to update both languages together on future changes. Cross-linked:
  each English page's index links to `docs/fr/README.md` and vice versa.
- These guides deliberately link to the exhaustive per-package READMEs
  (`packages/core/README.md`'s constraint table, each adapter's own
  limitations section) instead of duplicating them, so the source of truth
  stays in one place.
- **Fact-checking pass caught a real, pre-existing inaccuracy**, not just a
  wording issue: `resolveSchema` (`packages/core/src/validation/adapter-utils.ts:13-15`)
  falls back to `createCoreValidatorAdapter()` when `options.validator` is
  omitted — it never consults `getDefaultValidatorAdapter()`. So
  `registerZodValidator()` has **no effect** on React Hook Form, TanStack
  Form, VeeValidate, FormKit, or Nest unless you also pass
  `{validator: createZodValidatorAdapter()}` explicitly; they work out of the
  box on the core facade with zero Zod install. Angular Signal Forms never
  accepts a `validator` option at all (`DecorixAngularSignalFormOptions` has
  no such field) — the root README's old example
  (`toSignalForm(RegisterUserDto, {validator})`) would not even type-check.
  Angular Reactive Forms is the one exception that *does* consult the global
  registry, but only for the branch with no cross-field/async constraints.
  Corrected: `docs/*.md` + `docs/fr/*.md`, the root `README.md` Validator
  Registry section, and the "Validator Notes" section (plus install
  instructions dropping the forced Zod peer dependency) in
  `packages/adapters/{react-hook-form,react-tanstack-form,vue-vee-validate,
  vue-formkit,nest,zod}/README.md`.
- Updated the root `README.md` with a prominent link to `docs/README.md` right
  after the intro, plus a "Documentation" section replacing the old bare
  "Package READMEs" pointer.

### v0.1.1: Fix 4 Adapters Broken Since the v0.1.0 Publish

A user reported `angular-signal` didn't produce what `[formField]` expects, the same day `v0.1.0` was published. That triggered a full audit of all 9 framework adapters against each target library's *real* documentation/API (via Context7), not just what Decorix's own tests assumed. Result: 4 of 9 adapters were genuinely broken — they invented a plausible-looking shape instead of matching the real runtime contract, and none of them exercised the real target library in their tests (no actual devDependency on `@angular/forms`, `@tanstack/react-form`, `vee-validate`, or `@formkit/vue`).

- **`angular-signal`**: the old adapter fabricated its own `DecorixSignalForm`/`DecorixSignalField` facade (`.value()`/`.set()`/`.errors(): string[]`) and never called Angular's real `form()`/`@angular/forms/signals` API at all — structurally incompatible with `[formField]`. Rewritten to build a real `signal()`-backed model and a `schemaFn` mapping Decorix constraints onto Angular's native validators (`required`/`minLength`/`maxLength`/`min`/`max`/`email`/`pattern`), falling back to `validate()` (custom/cross-field sync) and `validateAsync()`/`resource()` (async), then calling the real `form()` — the adapter now returns Angular's own `FieldTree` unmodified. `options.validator`/Zod is no longer used (constraints are mapped straight from Decorix's constraint registry, like `angular-reactive` already does). A model field named `name` collides with `FieldTree`'s own `Function.prototype.name` at the type level — a real quirk of the library, not a Decorix bug (Angular's own docs avoid it too).
  - Test strategy: `form()` needs a fully bootstrapped Angular application (APP_ID, a change-detection scheduler, etc.) that a bare `Injector.create()` cannot replicate without pulling in `@angular/platform-browser`/`platform-server` plus a DOM — disproportionate for a patch release. Tests instead mock `@angular/forms/signals`/`@angular/core` to record exactly which native validator the adapter calls, with which path/message, and exercise the `validate()`/`validateAsync()` fallback callbacks directly. This targets the actual bug class (wrong function/argument shape) without needing a real Angular app; `tsc` still compiles the adapter against the real, unmocked `@angular/forms/signals` type declarations.
  - The two example scripts (`examples/angular-signal/*.ts`) export a factory instead of calling `toSignalForm` at module scope, since `form()` genuinely cannot run outside an Angular injection context — documented in the file and the package README.
- **`react-tanstack-form`**: `onSubmit`/`onSubmitAsync` treated their argument as the raw form values, but TanStack Form actually calls them with a context object (`{value, ...}`) — `ctx.value` holds the values. The return value must be `{fields: {name: message}} | undefined`, not a bare error map. Fixed both the call signature and return shape; `collectErrors` now keeps one message per field (`groupIssuesByField(issues, 'first')`).
- **`vue-vee-validate`**: `validationSchema` returned Decorix's own internal `ValidatorSchema` (`{validate, validateAsync}`), a shape vee-validate doesn't recognize in any form. Replaced with a generic per-field function map (`{fieldName: (value) => true | string | Promise<...>}`), the format `useForm`/`useField` accept natively. Cross-field constraints are best-effort at the field level (validated against the last known snapshot of sibling fields via `initialValues`) — documented as a known limitation; `config.validate()`/`validateAsync()` remain available for a fully accurate whole-object check on submit.
- **`vue-formkit`**: `formKitValidation()` pushed Decorix's own constraint names (`minLength`, `pattern`, `slug`, `equalsField`, ...) into FormKit's `validation` string, which FormKit silently ignores since it doesn't recognize them. Replaced with a real mapping to FormKit's own rule vocabulary (`length`, `matches`, `email`, `url`, `min`, `max`); constraints without a FormKit-native equivalent (`slug`, `integer`, `past`/`future`, `equalsField`, custom) are omitted from the string and documented as still enforced only via `config.validate()`/`validateAsync()`, not shown inline by FormKit.

All 4 packages got real devDependencies on their target library (previously absent, which is why the mismatch was never caught by typecheck), updated READMEs/examples, and new/rewritten test coverage. Bundled into a single `0.1.1` patch release per explicit decision (all 4 ship together rather than as separate patches). Full quality gate green: `pnpm lint`, `pnpm typecheck`, `pnpm examples:typecheck`, `pnpm build`, `pnpm test` (224 tests), `pnpm examples:run` (25 examples).

### `@hermiforge-decorix/cli` Coverage: All 9 Adapters

Only 3 of 9 adapters (`json-schema`, `zod`, `angular-validators`) had a dedicated CLI command; the other 6 required importing the adapter's `toXxx()` directly. Added the missing commands, all following the existing pattern exactly (discover the model, emit a thin TypeScript module re-exporting the adapter call — the CLI itself never imports the adapter, so no new dependency was needed in `packages/cli/package.json`):

- `angular-signal` → `toSignalForm` (`packages/cli/src/generators.ts` `renderAngularSignalModule`)
- `react-hook-form` → `toReactHookForm` (`renderReactHookFormModule`)
- `react-tanstack-form` → `toTanStackForm` (`renderReactTanStackFormModule`)
- `vue-formkit` → `toFormKit` (`renderVueFormKitModule`)
- `vue-vee-validate` → `toVeeValidate` (`renderVueVeeValidateModule`)
- `nest` → `DecorixPipe` (`renderNestModule`)

Generated export name follows each adapter's own return type: `${exportName}Config` for the config-shaped adapters (React/Vue), `${exportName}Form` for Angular Signal Forms (`DecorixSignalForm`), `${exportName}Pipe` for Nest (`DecorixPipeTransform`). Updated `packages/cli/README.md`'s usage/coverage sections and the root `README.md`'s CLI description accordingly.

Verification: `pnpm lint`, typecheck, `vitest run` (6 new unit tests covering exact generated module content), build — all green.

### Automated Release Pipeline (GitLab CI)

Tagging and publishing were fully manual (`pnpm tag:release`, `pnpm changeset publish` from a maintainer's machine). Automated the bump/tag/mirror-push sequence on merge to `main`, keeping the irreversible `npm publish` step behind a manual gate.

- **New `.gitlab-ci.yml`** (GitLab had no CI config before this; `.github/workflows/ci.yml` only covers the public mirror). Three stages:
  1. `verify` — same gate as GitHub's CI (`lint`, `typecheck`, `build`, `test`, in that order — build before test, per the CI bug fixed earlier this pass), runs on MRs and pushes to `dev`/`main`.
  2. `version-and-tag` (automatic on push to `main`) — runs the new `scripts/ci-release.mjs`.
  3. `publish-npm` (`when: manual`, needs `version-and-tag`) — reuses the previous job's artifact (bumped `package.json`s + built `dist/`) and runs `pnpm changeset publish`. Never runs automatically.
- **New `scripts/ci-release.mjs`** — distinct from `scripts/tag-release.mjs` (which stays for local/manual use; different credential model). Detects pending changesets (`.changeset/*.md` other than `README.md`); if none, exits 0 as a clean no-op (a merge with no changeset releases nothing). Otherwise: `pnpm changeset version` → commit `chore: release vX.Y.Z` → `pnpm build` → tag → push the commit+tag to GitLab `main` and GitHub `main` (authenticated remote URLs built from CI env vars, not a pre-configured git remote) → best-effort fast-forward push of the same commit onto GitLab `dev` (never force-pushed; a failed fast-forward is logged as a warning, not a pipeline failure — `dev` having diverged needs a manual resync).
- **Required GitLab CI/CD variables** (Settings → CI/CD → Variables, masked + protected — created by the maintainer, not by this pass): `NPM_TOKEN` (the granular automation token already used for manual publishing), `GITLAB_PUSH_TOKEN` (a token with `write_repository` scope, for the CI job to push back to GitLab), `GITHUB_PUSH_TOKEN` (a GitHub PAT with write access to `hermiforge/decorix`, for pushing the mirror).
- `publish-npm` writes the npm auth token to `.npmrc` at CI runtime only (`echo ... > .npmrc` in the job script) rather than committing a project `.npmrc` referencing `${NPM_TOKEN}` — npm resolves project-level `.npmrc` before the user-level one, so a committed reference would have shadowed a maintainer's already-configured local token (and some npm versions error outright on an unresolved `${VAR}` in `.npmrc`, which would have broken local `pnpm install`/`build` whenever `NPM_TOKEN` isn't set in a dev's shell).

Verified locally (no access to a real GitLab pipeline run from this environment): the no-pending-changeset path exits cleanly; the changeset/bump/commit/build/tag mechanics were verified end-to-end in an isolated throwaway clone (remote removed before running, to guarantee no network reach) using a fake changeset — correctly bumped all 11 packages, generated changelogs, committed, rebuilt `dist/`, and tagged. The actual multi-remote push (real GitLab/GitHub tokens, real merge trigger) is the remaining integration test, to run for real on the next `dev` → `main` merge.

### npm Scope Rename: `@decorix/*` → `@hermiforge-decorix/*`

The npm organization literally named "decorix" is not available (already taken by a third party), so the 11 packages could not be published under `@decorix/*` as originally named. The existing "hermiforge" npm organization is available, but a plain `@hermiforge/*` rename would drop the product name from every import; the user chose to keep both by publishing under **`@hermiforge-decorix`** instead.

- Renamed the npm scope in all 98 files that referenced `@decorix/` (package `name`/`dependencies` in the 11 published `package.json`, `tsconfig.base.json` `paths`, `vitest.config.ts` aliases, `tsdown.config.ts` `deps.neverBundle`, `.changeset/config.json` `fixed`, all adapter/CLI source imports, all 12 test files, all 25 example files, and every README/doc file).
- Deliberately left unchanged: the private root package's `"name": "decorix"`, the CLI's `bin` command name (`decorix`), native constraint issue codes (`decorix.required`, `decorix.type`, etc.), the `"decorix"` npm keyword, and the `hermiforge/decorix` GitHub/GitLab repository URLs — Decorix remains the product name, only the npm publishing scope changed.
- Creating the `hermiforge-decorix` organization on npmjs.com itself is a manual step for the maintainer, done outside this repo.

Verification: `pnpm install` (lockfile regenerated with the new package names), `pnpm lint`, typecheck 11 packages + `examples:typecheck`, `vitest run` 221 tests, build 11 packages, `pnpm examples:run` (25 examples), and a CLI smoke test (`decorix --help`) — all green.

### Pre-v1 Code Quality, Security, and Examples Pass

A three-part audit (file-size/duplication, security, functional completeness) ahead of the public v1 release turned up a handful of actionable items; all were addressed in this pass except the backlog items now recorded in TODO above.

- **Anti-duplication refactor.** Extracted issue-normalization helpers (`resolveConstraintDefinition`, `buildValidationContext`, `messageForConstraint`, `paramsForConstraintOptions`, `normalizeConstraintIssue`) from `packages/core/src/validation/engine.ts` into a new `packages/core/src/validation/issue-utils.ts`, exported from core, and pointed `packages/adapters/zod/src/adapter.ts` and `packages/adapters/angular-reactive/src/adapter.ts` at the shared versions instead of hand-copied duplicates (each dropped ~30 lines). Added `packages/core/src/validation/adapter-utils.ts` (`resolveSchema`, `defaultValuesFor`, `groupIssuesByField`) — split into a separate file from `issue-utils.ts` specifically to avoid a circular import (`adapter-utils` depends on `core-adapter.ts`, which depends on `engine.ts`; `issue-utils.ts` has no such dependency so `engine.ts` can safely import from it). Removed the matching duplicated `defaults()`/schema-resolution one-liner/error-grouping logic from `react-hook-form`, `angular-signal`, `vue-formkit`, `nest`, `vue-vee-validate`, and `react-tanstack-form`. No behavior change: all 204 pre-existing tests still pass unmodified.
- **`tsup` → `tsdown` migration.** `tsup` is no longer maintained (upstream deprecation notice pointing to `tsdown`). Replaced the root `tsup.config.ts` with `tsdown.config.ts` and updated the `build` script in all 11 published packages. Two behavioral gotchas found and worked around: (1) tsdown resolves `entry` relative to the shared config file's own directory by default, not the invoking package's cwd — fixed with an explicit `cwd: process.cwd()` in the config; (2) tsdown's default `fixedExtension: true` (when `platform: 'node'`, the default) forces `.mjs`/`.cjs` output regardless of `package.json`'s `type: "module"` — set `fixedExtension: false` to keep the existing `index.js`/`index.cjs` naming every package's `exports` map already relies on. Verified `dist/` output is equivalent (same filenames, comparable sizes; tsdown additionally emits `.d.ts.map`/`.d.cts.map`, which tsup did not — harmless).
- **Security/limitations documentation.** Added a security note to `fromJsonSchema` (`packages/adapters/json-schema/src/import.ts` TsDoc + `packages/adapters/json-schema/README.md`): an imported `pattern`/`RegExp` becomes a live constraint re-run on every validation, so only trusted schemas should be imported (ReDoS risk otherwise). Added a security note to `packages/cli/README.md`: the CLI actually executes the entry file (via tsx/esbuild), not a static parse — don't point it at untrusted DTOs. Documented the CLI's current 3-of-9-adapter coverage in the same README. Added a "Positioning: Validation, Not Transformation" section to the root `README.md` clarifying Decorix never coerces/transforms values.
- **Constraint reference.** Added a full native-constraint reference table (decorator / builder method / registered name, grouped by category) to `packages/core/README.md`.
- **`@hermiforge-decorix/zod` test coverage.** Added an `it.each`-driven test covering every previously-untested native Zod mapping (`nullable`, `maxLength`, `length`, `url`, `uuid`, `pattern`, `between`, `positive`, `positiveOrZero`, `negative`, `negativeOrZero`, `multipleOf`, `maxItems`, `size`, `enum`, `oneOf`, `notOneOf`) — 9 → 26 tests in `packages/adapters/zod/test/zod.test.ts`.
- **`examples/` overhaul.** The 21 example files were near-identical single-field copies, never actually executed (only `tsc --noEmit`), and demonstrated no advanced feature. Reworked all of them around a shared multi-field `RegisterUserDto` (name/email/age/password+confirmPassword with a cross-field `EqualsField`) that prints real validation output for both a valid and an invalid payload. Added `examples/advanced/` (async validation, custom constraints in decorator+builder/sync+async form, cross-field + object-level constraints, nested objects/arrays, validation groups, `@hermiforge-decorix/cli` programmatic API). Made examples actually runnable: added `tsx` as a root devDependency, `examples/run-all.mjs` (executes every `.ts` file via `node --import tsx`, pointing `TSX_TSCONFIG_PATH` at `examples/tsconfig.json` explicitly — same root-cause fix as the V5.1 CLI loader bug, since tsx's own upward tsconfig discovery stops at the root `tsconfig.json`'s `files: []` before reaching `examples/tsconfig.json`), and a new `pnpm examples:run` script. Removed the dead `examples/*` entry from `pnpm-workspace.yaml`/root `package.json` `workspaces` (no subdirectory was ever a real pnpm package). Added `examples/README.md`.

Verification: `pnpm lint` clean, typecheck 11 packages + `examples:typecheck`, `vitest run` 221 tests (12 files, up from 204), build 11 packages, and `pnpm examples:run` all green (25 examples executed, real output confirmed).

### Public v1 Pre-Release Checklist

Audited the repo for gaps before the first public npm publish and closed the ones that were file/doc changes (publication itself and the GitHub push are left to the maintainer):

- **Publishing metadata**: added `publishConfig: {"access": "public"}`, `author`, `repository` (with per-package `directory`), `homepage`, `bugs`, `keywords`, `engines.node: ">=22"`, and `sideEffects: false` to the root `package.json` and all 11 published packages (`core`, `cli`, `adapters/*`). Without `publishConfig.access`, `npm publish`/`pnpm publish` on a scoped `@hermiforge-decorix/*` package fails by default.
- **Release scripts**: added `changeset`, `version` (`changeset version`), and `release` (`pnpm build && changeset publish`) to the root `package.json`, wiring up the already-installed `@changesets/cli` and existing `.changeset/config.json` (which had no script to invoke it).
- **PeerDependencies loosened**: the 8 adapters with framework peers (`angular-reactive`, `angular-signal`, `react-hook-form`, `react-tanstack-form`, `vue-formkit`, `vue-vee-validate`, `nest`, `zod`) previously pinned exact versions (e.g. `"react": "19.2.7"`), which triggers peer-dependency warnings/errors for any consumer on a different patch/minor. Changed to caret ranges (`"react": "^19.2.0"`, etc.) on the same major/minor baseline.
- **License visibility**: each of the 11 package READMEs gained a short License section (none previously mentioned licensing despite `package.json` declaring `LGPL-3.0-or-later`).
- **Repo hygiene files added**: `CONTRIBUTING.md` (setup, quality gate, changeset workflow), `SECURITY.md` (private vulnerability reporting), `.nvmrc` (`22`, matching CI), `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/{bug_report,feature_request}.md`.
- **Root README**: added CI and license badges, listed `@hermiforge-decorix/cli` in the "Packages" section (previously only mentioned lower down), added a Contributing section linking `CONTRIBUTING.md`/`SECURITY.md`.

Explicitly out of scope for this pass (see Current Decisions above): CI release automation, the actual first `pnpm changeset`/publish, and pushing/migrating the repo to GitHub — these are maintainer actions, not file changes.

### License: LGPL-3.0-or-later

Ahead of the public v1 publish, added a repo-wide license. Chose LGPL v3 over plain GPL v3: plain GPL would force any application merely importing `@hermiforge-decorix/*` to also be GPL-licensed, which is unusual and adoption-limiting for a library; LGPL keeps copyleft on Decorix's own source and modifications while letting consuming applications keep their own license.

- Added `LICENSE` (full LGPL-3.0 text, incorporating GNU GPL v3 by reference per its own terms).
- Added `"license": "LGPL-3.0-or-later"` to the root `package.json` and to all 11 published packages (`core`, `cli`, and the 9 packages under `packages/adapters/`).
- Added a License section to the root `README.md` linking to `LICENSE` and the incorporated GPL v3 text.

Note: only the LGPL-specific text is bundled (matches GitHub/npm license detection); the full incorporated GNU GPL v3 text itself is referenced by URL rather than duplicated in-repo.

### Repo Layout: Adapters Grouped Under `packages/adapters/`

Moved the 9 framework/format adapter packages (`angular-reactive`, `angular-signal`, `json-schema`, `nest`, `react-hook-form`, `react-tanstack-form`, `vue-formkit`, `vue-vee-validate`, `zod`) from `packages/<name>` to `packages/adapters/<name>`, so the layout reflects the split between foundations (`core`, `cli`, staying directly under `packages/`) and framework adapters. Published npm package names (`@hermiforge-decorix/zod`, etc.) and internal `src`/`test` layout are unchanged — only the on-disk location moved.

- Updated workspace globs (`pnpm-workspace.yaml`, root `package.json` `workspaces`) to add `packages/adapters/*`.
- Updated `tsconfig.base.json` path aliases, `vitest.config.ts` aliases + `test.include`, and `eslint.config.mjs` `files` globs to cover the new location alongside the existing `packages/*` pattern.
- Each moved package's `package.json` (`build`/`test` scripts) and `tsconfig.json` (`extends`) now point one level deeper (`../../../` instead of `../../`).
- Regenerated `pnpm-lock.yaml` via `pnpm install` after the move.

Verification: `pnpm lint` clean, typecheck 11 packages + `examples:typecheck`, `vitest run` 204 tests (12 files), build 11 packages — all green.

### V5.3 Callable Custom-Constraint API (DX, pre-publish breaking change)

Improved custom-constraint ergonomics before publish (no back-compat kept — not yet released). `defineConstraint`/`defineAsyncConstraint` now return a **callable** `ReusableConstraint`: it applies directly as a decorator (`@StartsWithA()` / `@StartsWithA('override')`, like the native `@Required()`), and the builder `.constraint(...)` accepts it **by reference** (`stringField().constraint(StartsWithA)`) — removing magic strings and gaining type-safety/refactorability. The old `.decorator()` method and `ReusableConstraint.decorator` were removed. `constraint.name` and `constraint.constraint(...)` (metadata factory) are retained.

- Option payloads still go through the generic `@Constraint(name, options)` decorator and the string form `.constraint(name, options)` (the callable only takes a message/groups override, matching native decorators).
- Builder `.constraint()` is overloaded: `(constraint: ReusableConstraint, arg?)` and `(name: string, options?, arg?)`. The string form remains for `createConstraint`-only definitions and dynamic names (CLI / JSON Schema import).
- Convention: PascalCase const for decorator use, camelCase registry `name`.

Key files: `packages/core/src/validation/define-constraint.ts` (callable via `Object.defineProperty` name override + `Object.assign`), `packages/core/src/builder/field-builders.ts` (overload + `import type ReusableConstraint`). All in-repo usages migrated (`@x.decorator()` → `@X()`, `.constraint('name')` → `.constraint(X)`); README updated.

Verification: `pnpm lint` clean, typecheck 11 packages + `examples:typecheck`, `vitest run` 204 tests, build 11 packages — all green.

### V5.2 Validator Test Coverage Hardening (pre-publish)

Ahead of an npm/GitHub publish, symmetric builder + decorator coverage of validators was added across every package. Previously only `@hermiforge-decorix/core` (and `@hermiforge-decorix/zod` partially) exercised custom sync constraints and decorator-mode custom/cross-field paths; the 7 downstream adapters tested only a single builder-mode async constraint. Added per adapter (react-hook-form, nest, angular-signal, angular-reactive, vue-vee-validate, vue-formkit, react-tanstack-form): a custom **sync** constraint in builder **and** decorator mode, a custom **async** constraint in decorator mode, a cross-field (`@EqualsField`) constraint in decorator mode, and native number/date runtime enforcement in both modes. Also: `@hermiforge-decorix/zod` gained decorator-mode custom + options-payload params + native number/date breadth; `@hermiforge-decorix/json-schema` gained a custom-field-constraint preservation round-trip; `@hermiforge-decorix/cli` gained a scan test surfacing a custom constraint name from decorator + builder fixtures; `@hermiforge-decorix/core` gained an options-payload → `issue.params` case.

- Tests only — no package source changed. Constraint names are prefixed per package to avoid `defaultConstraintRegistry` collisions across a single vitest run.
- Note: decorator-declared array fields have no element type, so array constraints are exercised in builder mode only (Zod-backed adapters require an array `item`).

Verification: `pnpm lint` clean, typecheck 11 packages + `examples:typecheck`, `vitest run` **204 tests** (12 files, up from 172), build 11 packages — all green.

### V5.1 CLI Decorator Loading Fix

The V5 CLI shipped with its primary command broken for decorator DTOs (only the pure render functions were unit-tested; `loadEntry` was never exercised end to end). Two bugs were fixed:

- **Standard-decorator emit.** `loadEntry` loaded entries via `tsImport` without imposing a tsconfig, so tsx/esbuild emitted TC39 standard decorators (`__decorateElement`) and crashed Decorix's legacy-decorator runtime (`Cannot read properties of undefined (reading 'constructor')`). The earlier claim that the loader "supports experimentalDecorators" was false in practice — the root `tsconfig.json` has `files: []`, so tsx's default discovery applied no `experimentalDecorators`. Fix: `loadEntry(entry, tsconfigPath?)` now resolves the nearest `tsconfig.json` above the entry (then the CWD) and passes it explicitly to `tsImport`; a new `--tsconfig` option overrides it. Added a hint on the constructor-crash message.
- **Cross-instance registry.** Decorator metadata lived only in a module-private `WeakMap` in `@hermiforge-decorix/core`. When a DTO is transpiled under tsx's core instance but inspected under the natively-loaded core instance (the CLI), the two WeakMaps differ and `hasModelMetadata` returned false — so decorator models were never discovered (builder models escaped this via structural `isModelMetadata`). Fix: the registry now mirrors metadata onto the class under `Symbol.for('decorix.model.metadata')` (a non-enumerable, cross-instance-shared key); `hasModelMetadata`/`getModelMetadata` fall back to the mirror.
- **Real end-to-end coverage.** Added `packages/cli/test/cli-e2e.test.ts` driving the real `runCli` against on-disk `.ts` fixtures (decorator + builder), plus exported fixtures under `packages/cli/test/fixtures/`.

Key files modified:

- `packages/cli/src/loader.ts` (nearest-tsconfig resolution, explicit `tsconfig` to `tsImport`)
- `packages/cli/src/cli.ts` (`--tsconfig` option), `packages/cli/bin/decorix.mjs` (crash hint)
- `packages/core/src/registry/model-registry.ts` (global-symbol metadata mirror)
- `packages/cli/test/{cli-e2e.test.ts,fixtures/*}` (new), `packages/cli/README.md`

### V5 Async, Zod, Angular, CLI

Async foundation:

- Added optional `ValidatorSchema.validateAsync`; `createCoreValidatorAdapter` now exposes it, and `runSchemaAsync(schema, value, options)` + `hasAsyncConstraints(metadata, registry?)` are exported from core.
- Every runtime adapter reaches async validation: react-hook-form resolver awaits `runSchemaAsync`; vue-vee-validate and vue-formkit gain `validateAsync`; react-tanstack-form gains `onSubmitAsync`; nest `transform` returns an awaited Promise for async models. Async constraints receive the full `ValidationContext` including `services`.

Zod:

- Async-aware adapter: `validateAsync` parses through `safeParseAsync`, `superRefine` callbacks await async definitions, and sync `validate` rejects async models (mirroring core). Runtime `group`/`locale`/`services` are threaded into custom-constraint contexts via a per-schema options ref. Added `notOneOf` native mapping; the rich native mapping and `superRefine` object/cross-field handling remain.

Angular:

- Reactive Forms: async constraints emitted as `asyncValidators: AsyncValidatorFn[]`; form config exposes `validateAsync`; a core-backed schema is created when cross-field or async constraints are present.
- Signal Forms: added `validAsync`/`errorsAsync`/`submitAsync` and per-field `errorsAsync`/`validAsync`; object-level and complex constraints stay delegated to core validation.

CLI:

- Added `@hermiforge-decorix/cli` with `bin` `decorix` and commands `scan`, `json-schema`, `zod`, `angular-validators`. Loads TS/JS DTO entries via tsx (esbuild), discovers `@Model` classes and builder metadata, and emits JSON Schema or thin re-export modules (`toZod` / `toReactiveFormConfig`) so constraint functions are never serialized. (Note: the original decorator-loading path was broken — see **V5.1 CLI Decorator Loading Fix** above for the `experimentalDecorators` and cross-instance-registry corrections.)

Files added:

- `packages/cli/**` (package, `src/{index,cli,loader,generators}.ts`, `bin/decorix.mjs`, tests, README)

Key files modified:

- `packages/core/src/validation/{types,engine,core-adapter}.ts`, `packages/core/src/index.ts`
- `packages/zod/src/adapter.ts`
- `packages/{react-hook-form,vue-vee-validate,vue-formkit,react-tanstack-form,nest}/src/{adapter,types}.ts`
- `packages/angular-reactive/src/{adapter,types}.ts`, `packages/angular-signal/src/{adapter,types}.ts`
- `tsconfig.base.json`, `vitest.config.ts` (CLI alias)

Verification: `pnpm lint` clean, `pnpm -r typecheck` passed (11 packages), `examples:typecheck` passed, `vitest run` passed (11 files, 167 tests), `pnpm build` succeeded.

### Quality Gate Tooling

- Hardened `tsconfig.base.json` with `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, and `noImplicitOverride`; removed the one surfaced issue (unused `Nullable` import in `packages/core/test/core.test.ts`).
- Added ESLint 9 flat config (`eslint.config.mjs`) with `typescript-eslint` + `eslint-plugin-sonarjs` recommended rules, plus `lint`/`lint:fix` scripts and a CI `pnpm lint` step.
- Fixed all SonarJS/typescript-eslint findings: linear-time email regexes (`packages/core/src/validation/native-constraints.ts`, `packages/angular-reactive/src/adapter.ts`), enclosed one-line `if` bodies in the `objectConstraint`/`pattern` validators, `DateLike` type aliases (native-constraints, field-builders, decorators), test-fixture rule relaxations (`no-hardcoded-passwords`/`no-duplicate-string`/`cognitive-complexity`), and a narrowly-justified `no-unsafe-function-type` disable on `ModelTarget`.
- Added a standing **Quality Gate** section requiring `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm build` to pass every pass.

Verification: `pnpm lint` clean, `pnpm -r typecheck` passed (10 packages), `examples:typecheck` passed, `vitest run` passed (10 files, 152 tests).

### V4 JSON Schema Export And Import

- Export was already complete (`toJsonSchema`/`fieldToJsonSchema`): native fragment merge, `x-decorix-constraints` preservation with `name`/`async`/`options`, and all native mappings (`MinLength`→`minLength`, `Length`→`minLength`+`maxLength`, `Email`/`Url`/`Uuid`→`format`, `Min`/`Max`/`Between`→numeric bounds, `Integer`→`type:"integer"`, array keywords, `Enum`/`OneOf`/`NotOneOf`→`enum`/`not`).
- Added `fromJsonSchema(schema)` importer (`packages/json-schema/src/import.ts`): best-effort standard-keyword → native-constraint conversion, field-type detection (array/object/enum/integer/number/boolean/date/string), nested objects and array items, and `required` → `field.required` (+ explicit `optional` constraint for non-required fields).
- `x-decorix-constraints` deserialization inverts the exporter: RegExp `{source, flags}` restored to `RegExp`; arrays/objects recursed; `'[function]'` predicate/validator sentinels preserved verbatim (functions are not reconstructed). Field-level entries append to the field; model-level entries become `objectConstraints`.
- UI metadata reconstructed (`title`/`description`/`readOnly`/`x-decorix-*`) for a full round-trip; `toJsonSchema(fromJsonSchema(x))` is stable for Decorix-produced schemas (verified by round-trip tests).
- Extended the readable `JsonSchema` type (`multipleOf`, `minItems`, `maxItems`, `uniqueItems`, `not`) and exported `fromJsonSchema` from the package index.

Files added:

- `packages/json-schema/src/import.ts`

Key files modified:

- `packages/json-schema/src/index.ts` (export `fromJsonSchema`)
- `packages/json-schema/src/types.ts` (readable keywords)
- `packages/json-schema/test/json-schema.test.ts` (round-trip, keyword mapping, extension preservation, nested/UI)
- `packages/json-schema/README.md` (Import section)

Verification: `pnpm -r typecheck` passed (10 packages), `examples:typecheck` passed, `vitest run` passed (10 files, 152 tests).

### V3 Custom Constraint APIs

- Added `defineConstraint` and `defineAsyncConstraint`: register a user constraint once and receive `{ name, decorator, constraint }` for "define once, reuse everywhere" usage across decorators, builders, and object-constraint arrays.
- Added a generic public `Constraint(name, options?, arg?)` decorator and a `createConstraintDecorator(name, defaultOptions?)` factory; the call-site `arg` overrides the decorator's baked-in default options.
- Added a public `BaseFieldBuilder.constraint(name, options?, arg?)` method so any builder can attach an arbitrary registered constraint (delegates to the existing `addConstraintName`).
- `createConstraint`, `createObjectConstraint`, and `createAsyncConstraint` now accept an optional target `registry` (default `defaultConstraintRegistry`), enabling isolated registries.
- Verified existing guarantees: unique names per registry (`ConstraintRegistry.register` throws on duplicates), user message precedence over definition message (`engine.ts` `constraint.message ?? input.message ?? messageFor(...)`), and custom-registry override via `validate(value, model, { registry })` with default-registry fallback.

Files added:

- `packages/core/src/validation/define-constraint.ts`

Key files modified:

- `packages/core/src/validation/constraint-registry.ts` (optional `registry` param on create helpers)
- `packages/core/src/decorators/constraints.ts` (`Constraint`, `createConstraintDecorator`)
- `packages/core/src/builder/field-builders.ts` (public `constraint` method)
- `packages/core/src/index.ts` (new exports)
- `packages/core/test/core.test.ts` (V3 coverage)
- `packages/core/README.md` (Custom Constraints section)

Verification: `pnpm -r typecheck` passed (10 packages), `examples:typecheck` passed, `vitest run` passed (10 files, 148 tests).

### V2 Cross-Field And Object Constraints

- Added native field-level cross-property constraints: `EqualsField`, `NotEqualsField`, `GreaterThanField`, `GreaterOrEqualField`, `LessThanField`, `LessOrEqualField`, `BeforeField`, `AfterField`, `RequiredIf`, and `ForbiddenIf`.
- Decorators attach cross-field constraints to the decorated field; builder methods mirror the decorator surface across common, number, and date builders.
- Field references are root dot-path strings and validation receives the full root object via `context.object`.
- Equality uses `Object.is`; numeric comparisons require both values to be numbers; date comparisons reuse date-like timestamp normalization.
- Missing current or peer values skip comparison constraints; `RequiredIf` runs for `null`/`undefined` and `ForbiddenIf` fails only for present values.
- Added `@ObjectConstraint({ path, validator, message, groups })` and builder/raw helpers for named reusable object constraints.
- Object constraint issue paths default to `[]`, or to the supplied path/validator issue path.
- JSON Schema preserves V2 field and object constraints under `x-decorix-constraints` and serializes function-valued options as `"[function]"`.
- Core-backed adapters enforce V2 through core validation.
- Angular Reactive omits V2 constraints from single-control `ValidatorFn`s and exposes a core-backed form-level `validate` when V2 metadata is present.
### V1 Follow-Up Hardening

- Added exhaustive per-constraint tests for every native V1 constraint across presence/nullity, strings, numbers, dates, collections, and enums.
- Covered valid and invalid values, absent-value skip behavior, type mismatch behavior where applicable, custom messages, and normalized issue shape.
- Added regression coverage for implicit required fields, explicit optional/nullable semantics, grouped constraints, nested object paths, arrays of nested objects, and sync rejection of async constraints.
- Added inline adapter snapshots for broad JSON Schema output, Angular Reactive descriptor mode, Vue FormKit validation strings, and React Hook Form resolver errors.

### V1 Core Validation Platform

- Replaced lightweight constraint metadata union with `{ name, options, message, groups }` records.
- Added `ConstraintDefinition`, `ValidationContext`, `ValidationIssueInput`, and JSON Schema fragment types.
- Added `ConstraintRegistry`, `defaultConstraintRegistry`, `registerConstraint`, `getConstraint`, `createConstraint`, `createObjectConstraint`, and `createAsyncConstraint`.
- Added native V1 constraint definitions for presence/nullity, strings, numbers, dates, collections, and enums.
- Added `validate` and `validateAsync` traversal over model metadata, nested objects, and arrays.
- Added implicit `field.required` handling for builder-created required fields.
- Implemented `Optional` skip only for `undefined` and `Nullable` skip only for `null`.
- Non-presence constraints ignore `null`/`undefined`.
- Type mismatches produce `decorix.type` issues.
- Group filtering runs ungrouped constraints always and grouped constraints only for matching `options.group`.
- Sync `validate` rejects async constraints and async Promise results with a clear error.
- Added `createCoreValidatorAdapter`.

### V1 Decorators And Builders

- Added option-object support with `{ message, groups }` while preserving simple string message overloads.
- Added decorators/builders for native V1 constraints:
  - Presence/nullity: `Required`, `Optional`, `Nullable`, `NotNull`, `NotUndefined`, `NotEmpty`, `NotBlank`.
  - Strings: `MinLength`, `MaxLength`, `Length`, `Pattern`, `Email`, `Url`, `Uuid`, `Slug`, `StartsWith`, `EndsWith`, `Contains`, `Lowercase`, `Uppercase`.
  - Numbers: `Min`, `Max`, `Between`, `Positive`, `PositiveOrZero`, `Negative`, `NegativeOrZero`, `Integer`, `Finite`, `MultipleOf`.
  - Dates: `Past`, `PastOrPresent`, `Future`, `FutureOrPresent`, `Before`, `After`, `BetweenDates`.
  - Collections: `MinItems`, `MaxItems`, `Size`, `UniqueItems`, `NotEmptyArray`.
  - Enums: `Enum`, `OneOf`, `NotOneOf`.

### V1 Adapter Updates

- JSON Schema now uses registered constraint definitions and `toJsonSchema` fragments.
- Zod maps common/native constraints using the new `name/options` metadata shape.
- Angular Reactive emits descriptors for all constraints and Angular `ValidatorFn`s for supported sync constraints.
- React Hook Form, React TanStack Form, Vue Vee Validate, Angular Signal, and Nest use the core validator facade by default when no validator is explicitly provided.
- Vue FormKit validation strings read the new `constraint.options` field.

### Verification

- `tsc --noEmit -p packages/core/tsconfig.json` passed.
- Package-by-package typecheck with `tsc --noEmit -p packages/*/tsconfig.json` passed.
- `tsc --noEmit -p examples/tsconfig.json` passed.
- `vitest run` passed: 10 test files, 143 tests.

### Handoff Notes

Files added:

- `ROADMAP.md`
- `packages/core/src/validation/constraint-registry.ts`
- `packages/core/src/validation/core-adapter.ts`
- `packages/core/src/validation/engine.ts`
- `packages/core/src/validation/native-constraints.ts`

Key files modified:

- `packages/core/src/metadata/types.ts`
- `packages/core/src/metadata/constraints.ts`
- `packages/core/src/metadata/clone.ts`
- `packages/core/src/decorators/constraints.ts`
- `packages/core/src/builder/field-builders.ts`
- `packages/core/src/index.ts`
- `packages/core/src/validation/types.ts`
- `packages/core/test/core.test.ts`
- `packages/json-schema/src/adapter.ts`
- `packages/zod/src/adapter.ts`
- `packages/angular-reactive/src/adapter.ts`
- `packages/angular-reactive/src/types.ts`
- `packages/angular-signal/src/adapter.ts`
- `packages/react-hook-form/src/adapter.ts`
- `packages/react-tanstack-form/src/adapter.ts`
- `packages/vue-vee-validate/src/adapter.ts`
- `packages/vue-formkit/src/validation.ts`
- `packages/nest/src/adapter.ts`
