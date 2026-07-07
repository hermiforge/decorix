import {getModelMetadata} from '../registry/model-registry';
import type {ConstraintMetadata, FieldMetadata, ModelMetadata, ModelTarget} from '../metadata/types';
import {defaultConstraintRegistry, type ConstraintRegistry} from './constraint-registry';
import {buildValidationContext, normalizeConstraintIssue, resolveConstraintDefinition} from './issue-utils';
import {defaultLocaleRegistry, type LocaleRegistry} from './locale-registry';
import type {ValidationIssue, ValidationResult} from './types';

/**
 * Options that control Decorix core validation traversal.
 */
export type ValidationOptions = {
    /** Constraint group to run in addition to ungrouped constraints. */
    group?: string;
    /** Locale value passed through to custom constraint definitions. */
    locale?: string;
    /** Per-validation services available to custom constraint definitions. */
    services?: Record<string, unknown>;
    /** Constraint registry override used for tests or isolated runtimes. */
    registry?: ConstraintRegistry;
    /** Locale message registry override used for tests or isolated runtimes. */
    localeRegistry?: LocaleRegistry;
};

type FieldState = {
    optional: boolean;
    nullable: boolean;
};

/**
 * Validates a value synchronously against Decorix model metadata.
 *
 * When `modelOrMetadata` is a decorated class reference, the class's own
 * instance type is inferred as the result type — no separate type or cast
 * needed even when `value` itself is untyped (`unknown`/parsed JSON/form data).
 *
 * @param value - Value to validate.
 * @param modelOrMetadata - Registered model target or raw metadata.
 * @param options - Optional group, locale, service, and registry controls.
 * @returns Normalized validation success or issue list.
 */
export function validate<T>(value: unknown, model: ModelTarget<T>, options?: ValidationOptions): ValidationResult<T>;
export function validate<TValue = unknown>(value: TValue, modelOrMetadata: ModelMetadata, options?: ValidationOptions): ValidationResult<TValue>;
export function validate(
    value: unknown,
    modelOrMetadata: ModelTarget | ModelMetadata,
    options: ValidationOptions = {}
): ValidationResult<unknown> {
    // The sync entrypoint rejects async definitions before traversal so callers never receive a partially evaluated result.
    const metadata = getModelMetadata(modelOrMetadata);
    const registry = options.registry ?? defaultConstraintRegistry;
    assertNoAsyncConstraints(metadata, registry);
    const issues = validateModelSync(value, metadata, options, registry);
    return issues.length ? {success: false, issues} : {success: true, data: value};
}

/**
 * Validates a value asynchronously against Decorix model metadata.
 *
 * When `modelOrMetadata` is a decorated class reference, the class's own
 * instance type is inferred as the result type — no separate type or cast
 * needed even when `value` itself is untyped (`unknown`/parsed JSON/form data).
 *
 * @param value - Value to validate.
 * @param modelOrMetadata - Registered model target or raw metadata.
 * @param options - Optional group, locale, service, and registry controls.
 * @returns Promise of normalized validation success or issue list.
 */
export async function validateAsync<T>(value: unknown, model: ModelTarget<T>, options?: ValidationOptions): Promise<ValidationResult<T>>;
export async function validateAsync<TValue = unknown>(value: TValue, modelOrMetadata: ModelMetadata, options?: ValidationOptions): Promise<ValidationResult<TValue>>;
export async function validateAsync(
    value: unknown,
    modelOrMetadata: ModelTarget | ModelMetadata,
    options: ValidationOptions = {}
): Promise<ValidationResult<unknown>> {
    const metadata = getModelMetadata(modelOrMetadata);
    const registry = options.registry ?? defaultConstraintRegistry;
    const issues = await validateModelAsync(value, metadata, options, registry);
    return issues.length ? {success: false, issues} : {success: true, data: value};
}

/**
 * Returns whether any field or object constraint in the model is asynchronous.
 *
 * Adapters use this to decide between the synchronous and asynchronous
 * validation paths without attempting a sync run that would throw.
 *
 * @param metadata - Model metadata to inspect.
 * @param registry - Registry resolving constraint definitions. Defaults to the process-wide registry.
 */
export function hasAsyncConstraints(metadata: ModelMetadata, registry: ConstraintRegistry = defaultConstraintRegistry): boolean {
    for (const field of walkFields(metadata.fields)) {
        if (field.constraints.some((constraint) => registry.hasAsync(constraint.name))) return true;
    }
    return (metadata.objectConstraints ?? []).some((constraint) => registry.hasAsync(constraint.name));
}

function assertNoAsyncConstraints(metadata: ModelMetadata, registry: ConstraintRegistry): void {
    for (const field of walkFields(metadata.fields)) {
        for (const constraint of field.constraints) {
            if (registry.hasAsync(constraint.name)) {
                throw new Error(`Decorix constraint "${constraint.name}" is async. Use validateAsync instead.`);
            }
        }
    }
    for (const constraint of metadata.objectConstraints ?? []) {
        if (registry.hasAsync(constraint.name)) {
            throw new Error(`Decorix constraint "${constraint.name}" is async. Use validateAsync instead.`);
        }
    }
}

function* walkFields(fields: FieldMetadata[]): Generator<FieldMetadata> {
    for (const field of fields) {
        yield field;
        if (field.fields) yield* walkFields(field.fields);
        if (field.item) yield* walkFields([field.item]);
    }
}

function validateModelSync(value: unknown, metadata: ModelMetadata, options: ValidationOptions, registry: ConstraintRegistry): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const object = isRecord(value) ? value : {};
    if (!isRecord(value)) {
        // Model validation always starts from an object-shaped value.
        issues.push({path: [], code: 'decorix.type', message: 'Value must be an object.', constraint: 'type', params: {expected: 'object'}});
        return issues;
    }
    for (const field of metadata.fields) {
        validateFieldSync(value, object[field.name], field, [field.name], options, registry, issues);
    }
    validateObjectConstraintsSync(value, metadata, options, registry, issues);
    return issues;
}

async function validateModelAsync(value: unknown, metadata: ModelMetadata, options: ValidationOptions, registry: ConstraintRegistry): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    const object = isRecord(value) ? value : {};
    if (!isRecord(value)) {
        // Model validation always starts from an object-shaped value.
        issues.push({path: [], code: 'decorix.type', message: 'Value must be an object.', constraint: 'type', params: {expected: 'object'}});
        return issues;
    }
    for (const field of metadata.fields) {
        await validateFieldAsync(value, object[field.name], field, [field.name], options, registry, issues);
    }
    await validateObjectConstraintsAsync(value, metadata, options, registry, issues);
    return issues;
}

function validateFieldSync(root: unknown, value: unknown, field: FieldMetadata, path: Array<string | number>, options: ValidationOptions, registry: ConstraintRegistry, issues: ValidationIssue[]): void {
    const state = fieldState(field);
    // Optional and nullable short-circuit only their matching absent value.
    if ((value === undefined && state.optional && !hasRequiredIf(field)) || (value === null && state.nullable && !hasRequiredIf(field))) return;
    const implicitRequired = requiredIssue(field, value, path, options.group);
    if (implicitRequired) issues.push(implicitRequired);

    for (const constraint of runnableConstraints(field.constraints, options.group)) {
        // Non-presence constraints do not run for null/undefined values.
        if (shouldSkipConstraint(value, constraint.name)) continue;
        const issue = runConstraintSync(root, value, field.name, constraint, path, options, registry);
        if (issue) issues.push(issue);
    }

    validateChildrenSync(root, value, field, path, options, registry, issues);
}

async function validateFieldAsync(root: unknown, value: unknown, field: FieldMetadata, path: Array<string | number>, options: ValidationOptions, registry: ConstraintRegistry, issues: ValidationIssue[]): Promise<void> {
    const state = fieldState(field);
    // Optional and nullable short-circuit only their matching absent value.
    if ((value === undefined && state.optional && !hasRequiredIf(field)) || (value === null && state.nullable && !hasRequiredIf(field))) return;
    const implicitRequired = requiredIssue(field, value, path, options.group);
    if (implicitRequired) issues.push(implicitRequired);

    for (const constraint of runnableConstraints(field.constraints, options.group)) {
        // Non-presence constraints do not run for null/undefined values.
        if (shouldSkipConstraint(value, constraint.name)) continue;
        const issue = await runConstraintAsync(root, value, field.name, constraint, path, options, registry);
        if (issue) issues.push(issue);
    }

    await validateChildrenAsync(root, value, field, path, options, registry, issues);
}

function validateChildrenSync(root: unknown, value: unknown, field: FieldMetadata, path: Array<string | number>, options: ValidationOptions, registry: ConstraintRegistry, issues: ValidationIssue[]): void {
    if (value === null || value === undefined) return;
    if (field.type === 'object' && field.fields) {
        if (!isRecord(value)) {
            // Structural child traversal reports a type issue at the child path.
            issues.push({path, code: 'decorix.type', message: 'Value must be an object.', constraint: 'type', params: {expected: 'object'}});
            return;
        }
        for (const child of field.fields) {
            validateFieldSync(root, value[child.name], child, [...path, child.name], options, registry, issues);
        }
    }
    if (field.type === 'array' && field.item) {
        if (!Array.isArray(value)) {
            // Array item validation only proceeds after the container shape is valid.
            issues.push({path, code: 'decorix.type', message: 'Value must be an array.', constraint: 'type', params: {expected: 'array'}});
            return;
        }
        value.forEach((item, index) => validateFieldSync(root, item, field.item!, [...path, index], options, registry, issues));
    }
}

async function validateChildrenAsync(root: unknown, value: unknown, field: FieldMetadata, path: Array<string | number>, options: ValidationOptions, registry: ConstraintRegistry, issues: ValidationIssue[]): Promise<void> {
    if (value === null || value === undefined) return;
    if (field.type === 'object' && field.fields) {
        if (!isRecord(value)) {
            // Structural child traversal reports a type issue at the child path.
            issues.push({path, code: 'decorix.type', message: 'Value must be an object.', constraint: 'type', params: {expected: 'object'}});
            return;
        }
        for (const child of field.fields) {
            await validateFieldAsync(root, value[child.name], child, [...path, child.name], options, registry, issues);
        }
    }
    if (field.type === 'array' && field.item) {
        if (!Array.isArray(value)) {
            // Array item validation only proceeds after the container shape is valid.
            issues.push({path, code: 'decorix.type', message: 'Value must be an array.', constraint: 'type', params: {expected: 'array'}});
            return;
        }
        for (let index = 0; index < value.length; index += 1) {
            await validateFieldAsync(root, value[index], field.item, [...path, index], options, registry, issues);
        }
    }
}

function requiredIssue(field: FieldMetadata, value: unknown, path: Array<string | number>, group?: string): ValidationIssue | undefined {
    if (!field.required || (value !== null && value !== undefined)) return undefined;
    const explicit = runnableConstraints(field.constraints, group).find((constraint) => constraint.name === 'required');
    // Explicit required constraints own their message and avoid duplicate issues.
    if (explicit) return undefined;
    return {path, code: 'decorix.required', message: 'Value is required.', constraint: 'required'};
}

function validateObjectConstraintsSync(root: unknown, metadata: ModelMetadata, options: ValidationOptions, registry: ConstraintRegistry, issues: ValidationIssue[]): void {
    for (const constraint of runnableConstraints(metadata.objectConstraints ?? [], options.group)) {
        const issue = runConstraintSync(root, root, metadata.name, constraint, [], options, registry);
        if (issue) issues.push(issue);
    }
}

async function validateObjectConstraintsAsync(root: unknown, metadata: ModelMetadata, options: ValidationOptions, registry: ConstraintRegistry, issues: ValidationIssue[]): Promise<void> {
    for (const constraint of runnableConstraints(metadata.objectConstraints ?? [], options.group)) {
        const issue = await runConstraintAsync(root, root, metadata.name, constraint, [], options, registry);
        if (issue) issues.push(issue);
    }
}

function runConstraintSync(root: unknown, value: unknown, property: string, constraint: ConstraintMetadata, path: Array<string | number>, options: ValidationOptions, registry: ConstraintRegistry): ValidationIssue | undefined {
    const definition = resolveConstraintDefinition(constraint, registry);
    const context = buildValidationContext(root, value, property, options);
    const result = definition.validate(value, constraint.options, context);
    if (result instanceof Promise) {
        throw new Error(`Decorix constraint "${constraint.name}" returned a Promise. Use validateAsync instead.`);
    }
    return normalizeConstraintIssue(result, definition, constraint, context, path, options.localeRegistry ?? defaultLocaleRegistry);
}

async function runConstraintAsync(root: unknown, value: unknown, property: string, constraint: ConstraintMetadata, path: Array<string | number>, options: ValidationOptions, registry: ConstraintRegistry): Promise<ValidationIssue | undefined> {
    const definition = resolveConstraintDefinition(constraint, registry);
    const context = buildValidationContext(root, value, property, options);
    const result = await definition.validate(value, constraint.options, context);
    return normalizeConstraintIssue(result, definition, constraint, context, path, options.localeRegistry ?? defaultLocaleRegistry);
}

function fieldState(field: FieldMetadata): FieldState {
    return {
        optional: !field.required || field.constraints.some((constraint) => constraint.name === 'optional'),
        nullable: field.constraints.some((constraint) => constraint.name === 'nullable')
    };
}

function runnableConstraints(constraints: ConstraintMetadata[], group?: string): ConstraintMetadata[] {
    return constraints.filter((constraint) => !constraint.groups?.length || (group !== undefined && constraint.groups.includes(group)));
}

function hasRequiredIf(field: FieldMetadata): boolean {
    return field.constraints.some((constraint) => constraint.name === 'requiredIf');
}

function shouldSkipConstraint(value: unknown, constraintName: string): boolean {
    if (constraintName === 'required' || constraintName === 'notNull' || constraintName === 'notUndefined' || constraintName === 'optional' || constraintName === 'nullable' || constraintName === 'requiredIf' || constraintName === 'forbiddenIf') {
        return false;
    }
    return value === null || value === undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
