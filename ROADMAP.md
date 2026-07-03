# Decorix Validation Platform Roadmap

This file is the durable handoff state for the validation-platform refactor. Keep it updated as work moves between `TODO`, `IN_PROGRESS`, and `DONE`.

## Current Decisions

- V1 may be breaking.
- Native default validation messages are English.
- Validation issues expose stable `code`, `path`, `message`, `constraint`, and optional `params`.
- Package split remains unchanged: `@decorix/angular-signal`, `@decorix/angular-reactive`, React/Vue/Nest packages stay separate.
- No aggregate `@decorix/angular` package unless requested later.
- Constraint metadata moved from the old `{ kind, value, message }` union to registry-driven records: `{ name, options, message, groups }`.
- Decorator/builder compatibility preserves simple overloads such as `.required('Message')`, `@Required('Message')`, and `@MinLength(3, 'Message')`.
- Adapters with no explicit validator now use the core validator facade. An explicit missing validator name still throws the previous registry error.
- Commit after each completed implementation pass so handoffs always have a clean recorded checkpoint.

## Documentation and Constraint Coverage Standard

- Every exported type, interface, class, function, decorator, builder, adapter, and public helper must have TsDoc that explains its role and parameters when applicable.
- Important internal helpers that perform validation, constraint conversion, registry lookup, traversal, or issue normalization must also have TsDoc or a nearby explanatory comment.
- Non-trivial branches, fallback paths, framework limitations, constraint conversions, and async/sync validation boundaries need line comments that explain why the branch exists.
- Custom validation fallback logic must never be uncommented.
- No adapter may ignore a core constraint. If the target framework cannot express a constraint natively, the adapter must preserve it in descriptors or schema metadata and enforce it through Decorix custom/core validation where the framework allows runtime validation.
- Sync-only adapter paths must fail clearly when they encounter async constraints, unless the framework-specific integration exposes an async validation path.

## Quality Gate (run every pass)

- Before committing any implementation pass, run and pass all of: `pnpm lint` (ESLint + SonarJS), `pnpm typecheck` (strict flags), `pnpm examples:typecheck`, `pnpm test`, and `pnpm build`.
- Fix every lint/type finding. If a rule is genuinely inapplicable, disable it narrowly (inline `eslint-disable-next-line` or a scoped override in `eslint.config.mjs`) with a one-line rationale — never silence findings broadly or leave them unresolved.
- CI enforces `lint`, `typecheck`, `test`, and `build`; keep the tree green so every handoff is a clean checkpoint.

## IN_PROGRESS

- No active item at the end of this implementation pass.

## TODO

- No open roadmap items. New work should be appended here before implementation.

## DONE

### V5.1 CLI Decorator Loading Fix

The V5 CLI shipped with its primary command broken for decorator DTOs (only the pure render functions were unit-tested; `loadEntry` was never exercised end to end). Two bugs were fixed:

- **Standard-decorator emit.** `loadEntry` loaded entries via `tsImport` without imposing a tsconfig, so tsx/esbuild emitted TC39 standard decorators (`__decorateElement`) and crashed Decorix's legacy-decorator runtime (`Cannot read properties of undefined (reading 'constructor')`). The earlier claim that the loader "supports experimentalDecorators" was false in practice — the root `tsconfig.json` has `files: []`, so tsx's default discovery applied no `experimentalDecorators`. Fix: `loadEntry(entry, tsconfigPath?)` now resolves the nearest `tsconfig.json` above the entry (then the CWD) and passes it explicitly to `tsImport`; a new `--tsconfig` option overrides it. Added a hint on the constructor-crash message.
- **Cross-instance registry.** Decorator metadata lived only in a module-private `WeakMap` in `@decorix/core`. When a DTO is transpiled under tsx's core instance but inspected under the natively-loaded core instance (the CLI), the two WeakMaps differ and `hasModelMetadata` returned false — so decorator models were never discovered (builder models escaped this via structural `isModelMetadata`). Fix: the registry now mirrors metadata onto the class under `Symbol.for('decorix.model.metadata')` (a non-enumerable, cross-instance-shared key); `hasModelMetadata`/`getModelMetadata` fall back to the mirror.
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

- Added `@decorix/cli` with `bin` `decorix` and commands `scan`, `json-schema`, `zod`, `angular-validators`. Loads TS/JS DTO entries via tsx (esbuild), discovers `@Model` classes and builder metadata, and emits JSON Schema or thin re-export modules (`toZod` / `toReactiveFormConfig`) so constraint functions are never serialized. (Note: the original decorator-loading path was broken — see **V5.1 CLI Decorator Loading Fix** above for the `experimentalDecorators` and cross-instance-registry corrections.)

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
