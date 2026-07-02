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

## Documentation and Constraint Coverage Standard

- Every exported type, interface, class, function, decorator, builder, adapter, and public helper must have TsDoc that explains its role and parameters when applicable.
- Important internal helpers that perform validation, constraint conversion, registry lookup, traversal, or issue normalization must also have TsDoc or a nearby explanatory comment.
- Non-trivial branches, fallback paths, framework limitations, constraint conversions, and async/sync validation boundaries need line comments that explain why the branch exists.
- Custom validation fallback logic must never be uncommented.
- No adapter may ignore a core constraint. If the target framework cannot express a constraint natively, the adapter must preserve it in descriptors or schema metadata and enforce it through Decorix custom/core validation where the framework allows runtime validation.
- Sync-only adapter paths must fail clearly when they encounter async constraints, unless the framework-specific integration exposes an async validation path.
## IN_PROGRESS

- No active item at the end of this implementation pass.

## TODO

### V2 Cross-Field And Object Constraints

Field-level cross-property constraints:

- `EqualsField`
- `NotEqualsField`
- `GreaterThanField`
- `GreaterOrEqualField`
- `LessThanField`
- `LessOrEqualField`
- `BeforeField`
- `AfterField`
- `RequiredIf`
- `ForbiddenIf`

Class-level object constraints example:

```ts
@ObjectConstraint({
  path: 'endDate',
  validator: booking => booking.startDate < booking.endDate,
  message: 'End date must be after start date.'
})
```

Rules:

- Store object constraints on `ModelMetadata.objectConstraints`.
- Field cross-property constraints stay attached to the decorated field and receive `context.object`.
- Error path defaults to decorated field for cross-field constraints and to `options.path`/`errorPath` for object constraints.
- JSON Schema export marks non-exportable object/cross-field constraints in `x-decorix-constraints`.

### V3 Custom Constraint APIs

- Implement reusable user-defined annotations.
- Custom decorators support `{ groups, message }` consistently.
- User message overrides definition message.
- Constraint names must be unique within a registry.
- Default global registry is used unless validation receives a custom registry.

### V4 JSON Schema Export And Import

Export:

- Use `toJsonSchema` on constraint definitions.
- Merge compatible fragments into field schemas.
- Preserve non-exportable constraints under `x-decorix-constraints` with `name`, `async`, and `options`.

Native mappings:

- `MinLength` -> `minLength`
- `MaxLength` -> `maxLength`
- `Length` -> `minLength` + `maxLength`
- `Pattern` -> `pattern`
- `Email`/`Url`/`Uuid` -> `format`
- `Min`/`Max`/`Between` -> numeric bounds
- `Integer` -> `type: "integer"`
- `MultipleOf` -> `multipleOf`
- `MinItems`/`MaxItems`/`Size`/`UniqueItems` -> array keywords
- `Enum`/`OneOf`/`NotOneOf` -> `enum`/`not`

Import:

- Best-effort conversion from standard JSON Schema keywords to native constraints.
- Preserve unknown `x-decorix-constraints`.
- Do not reconstruct arbitrary custom validator functions.

### V5 Async, Zod, Angular, CLI

Async validation:

- Add richer async adapter integration. Core `validateAsync` exists, but framework adapters still mostly use sync facades.
- Async constraints receive same `ValidationContext`, including `services`.

Zod:

- Generate fuller Zod schemas for native field constraints.
- Use `superRefine` for cross-field/object constraints once V2 exists.
- Use async `safeParseAsync` only when async constraints are present.
- Fallback to core validation for rules Zod cannot express cleanly.

Angular:

- Reactive Forms: async validators for async constraints.
- Signal Forms: equivalent metadata and validation hooks.
- Delegate complex object-level constraints to core validation.

CLI:

- Add `@decorix/cli`.
- Commands: `decorix scan`, `decorix json-schema`, `decorix zod`, `decorix angular-validators`.
- CLI reads DTO entrypoints, loads metadata, and writes artifacts without app runtime bootstrapping.

## DONE

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
- `vitest run` passed: 10 test files, 133 tests.

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
