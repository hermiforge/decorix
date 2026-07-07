import {resource, signal} from '@angular/core';
import {email, form, max, maxLength, min, minLength, pattern, required, validate, validateAsync} from '@angular/forms/signals';
import {
    buildValidationContext,
    defaultValuesFor,
    getModelMetadata,
    normalizeConstraintIssue,
    resolveConstraintDefinition
} from '@hermiforge-decorix/core';
import type {ConstraintMetadata, FieldMetadata, ModelMetadata} from '@hermiforge-decorix/core';
import type {FieldTree, SchemaPath, SchemaPathTree, ValidationError} from '@angular/forms/signals';
import type {Signal} from '@angular/core';
import type {DecorixAngularSignalFormOptions, DecorixSignalFormModel} from './types';

/** Loosely-typed path handle: Decorix builds the schema from runtime metadata, not static model types. */
type AnyPath = SchemaPath<never>;
type AnyPathTree = Record<string, AnyPath>;

/**
 * Creates a real Angular Signal Forms `FieldTree` from Decorix metadata.
 *
 * Builds a `signal()`-backed model and a `schemaFn` that maps Decorix constraints onto Angular's
 * native validators (`required`, `minLength`, `maxLength`, `min`, `max`, `email`, `pattern`), falling
 * back to `validate()`/`validateAsync()` for constraints without a native Angular equivalent (custom
 * and cross-field constraints, and async constraints respectively) — then calls the real `form()`.
 *
 * The returned `FieldTree` is Angular's own, unmodified: bind it with `[formField]`, read
 * `form.field().errors()`/`.valid()`/`.value()`, and submit with the real `submit()` function from
 * `@angular/forms/signals` — this adapter does not invent its own form facade.
 *
 * @param modelOrMetadata - Registered Decorix model target or raw metadata.
 * @param options - Optional initial value, validator adapter, and injector (required for async
 * constraints when called outside an Angular injection context; see `resource()`'s docs).
 */
export function toSignalForm<TModel = Record<string, unknown>>(
    modelOrMetadata: DecorixSignalFormModel<TModel>,
    options: DecorixAngularSignalFormOptions = {}
): FieldTree<TModel> {
    const metadata = getModelMetadata(modelOrMetadata);
    // `SchemaPathTree`/`form()` require a mapped-object shape (an index-signature-friendly
    // type), which a plain class/interface type doesn't structurally satisfy — normalize
    // through an identity mapped type so a decorated class can still be inferred as `TModel`
    // at the public API surface without the caller needing a `Pick<T, keyof T>` workaround.
    type Normalized = {[K in keyof TModel]: TModel[K]};
    const initial = defaultValuesFor(metadata, options.initialValue) as Normalized;
    const model = signal(initial);

    return form(model, (rootPath: SchemaPathTree<Normalized>) => {
        const paths = rootPath as unknown as AnyPathTree;
        for (const field of metadata.fields) {
            const fieldPath = paths[field.name];
            for (const constraint of fieldConstraintsFor(field)) {
                applyConstraint(constraint, field, fieldPath, metadata, paths, options);
            }
        }
    }) as unknown as FieldTree<TModel>;
}

/** Prepends an implicit `required` constraint when the field is required but declares none explicitly. */
function fieldConstraintsFor(field: FieldMetadata): ConstraintMetadata[] {
    const hasRequiredConstraint = field.constraints.some((constraint) => constraint.name === 'required');
    return field.required && !hasRequiredConstraint ? [{name: 'required'}, ...field.constraints] : field.constraints;
}

/** Maps one Decorix constraint onto a native Angular Signal Forms validator, or a fallback. */
function applyConstraint(
    constraint: ConstraintMetadata,
    field: FieldMetadata,
    fieldPath: AnyPath,
    metadata: ModelMetadata,
    rootPaths: AnyPathTree,
    options: DecorixAngularSignalFormOptions
): void {
    switch (constraint.name) {
        case 'required':
            required(fieldPath, {message: constraint.message});
            return;
        case 'minLength':
            minLength(fieldPath as SchemaPath<string>, constraint.options as number, {message: constraint.message});
            return;
        case 'maxLength':
            maxLength(fieldPath as SchemaPath<string>, constraint.options as number, {message: constraint.message});
            return;
        case 'min':
            min(fieldPath as SchemaPath<number>, constraint.options as number, {message: constraint.message});
            return;
        case 'max':
            max(fieldPath as SchemaPath<number>, constraint.options as number, {message: constraint.message});
            return;
        case 'email':
            email(fieldPath as SchemaPath<string>, {message: constraint.message});
            return;
        case 'pattern':
            pattern(fieldPath as SchemaPath<string>, constraint.options as RegExp, {message: constraint.message});
            return;
        default:
            break;
    }

    const definition = resolveConstraintDefinition(constraint);
    if (definition.async) {
        applyAsyncFallback(constraint, field, fieldPath, options);
    } else {
        applySyncFallback(constraint, field, fieldPath, metadata, rootPaths);
    }
}

/** Runs a non-native sync constraint (custom or cross-field) through Angular's `validate()`. */
function applySyncFallback(
    constraint: ConstraintMetadata,
    field: FieldMetadata,
    fieldPath: AnyPath,
    metadata: ModelMetadata,
    rootPaths: AnyPathTree
): void {
    const definition = resolveConstraintDefinition(constraint);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validate(fieldPath, (ctx: any): ValidationError | null => {
        const value = ctx.value();
        const object: Record<string, unknown> = {};
        for (const sibling of metadata.fields) {
            object[sibling.name] = sibling.name === field.name ? value : ctx.valueOf(rootPaths[sibling.name]);
        }

        const context = buildValidationContext(object, value, field.name);
        const result = definition.validate(value, constraint.options, context);
        if (result instanceof Promise) {
            throw new Error(`Decorix constraint "${constraint.name}" is async and cannot run as a sync validator.`);
        }
        const issue = normalizeConstraintIssue(result, definition, constraint, context);
        return issue ? {kind: constraint.name, message: issue.message} : null;
    });
}

/** Runs an async Decorix constraint through Angular's `validateAsync()`/`resource()`. */
function applyAsyncFallback(
    constraint: ConstraintMetadata,
    field: FieldMetadata,
    fieldPath: AnyPath,
    options: DecorixAngularSignalFormOptions
): void {
    const definition = resolveConstraintDefinition(constraint);

    validateAsync(fieldPath, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        params: (ctx: any) => {
            const value = ctx.value();
            return value === undefined || value === null || value === '' ? undefined : value;
        },
        factory: (paramsSignal: Signal<unknown>) => resource({
            params: () => paramsSignal(),
            loader: async ({params}: {params: unknown}) => {
                const context = buildValidationContext({}, params, field.name);
                return definition.validate(params, constraint.options, context);
            },
            ...(options.injector ? {injector: options.injector} : {})
        }),
        onSuccess: (result: unknown, ctx): ValidationError | null => {
            const context = buildValidationContext({}, ctx.value(), field.name);
            const issue = normalizeConstraintIssue(result as boolean, definition, constraint, context);
            return issue ? {kind: constraint.name, message: issue.message} : null;
        },
        onError: (): ValidationError => ({kind: constraint.name, message: 'Validation failed.'})
    });
}
