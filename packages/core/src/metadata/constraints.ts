import type {ConstraintMetadata, FieldMetadata, ObjectConstraintOptions, ValidationIssueInput} from './types';

/**
 * Optional message and validation groups accepted by Decorix constraints.
 */
export type ConstraintOptions = {
    /** Message overriding the native or custom constraint default message. */
    message?: string;
    /** Validation groups in which the constraint should run. */
    groups?: string[];
};

/**
 * Normalizes shorthand message or object constraint options.
 */
export function normalizeConstraintOptions(value?: string | ConstraintOptions): ConstraintOptions {
    return typeof value === 'string' ? {message: value} : value ?? {};
}

/**
 * Creates canonical constraint metadata from a constraint name, options, and message/group metadata.
 */
export function createConstraintMetadata<TOptions>(
    name: string,
    options?: TOptions,
    metadata: ConstraintOptions = {}
): ConstraintMetadata<TOptions> {
    return {
        name,
        ...(options === undefined ? {} : {options}),
        ...(metadata.message === undefined ? {} : {message: metadata.message}),
        ...(metadata.groups === undefined ? {} : {groups: [...metadata.groups]})
    };
}

/**
 * Adds or replaces a constraint by name on a field metadata object.
 */
export function upsertConstraintMetadata(
    field: Pick<FieldMetadata, 'constraints'>,
    constraint: ConstraintMetadata
): void {
    const index = field.constraints.findIndex((current) => current.name === constraint.name);
    if (index >= 0) {
        // Constraint names are unique per field so decorators/builders can override earlier configuration.
        field.constraints[index] = constraint;
        return;
    }

    field.constraints.push(constraint);
}

/**
 * Removes every constraint with the supplied name from a field metadata object.
 */
export function removeConstraintMetadata(field: Pick<FieldMetadata, 'constraints'>, name: string): void {
    field.constraints = field.constraints.filter((constraint) => constraint.name !== name);
}

/**
 * Returns a constraint metadata name.
 */
export function constraintName(constraint: ConstraintMetadata): string {
    return constraint.name;
}

/**
 * Returns a typed constraint option payload when one is present.
 */
export function constraintValue<T = unknown>(constraint: ConstraintMetadata<T>): T | undefined {
    return constraint.options;
}
/** Options accepted by the public object-constraint decorator/helper APIs. */
export type ObjectConstraintMetadataOptions<TObject = unknown> = {
    /** Optional issue path. Defaults to the object root. */
    path?: string | Array<string | number>;
    /** Object-level validator. */
    validator: (object: TObject) => boolean | ValidationIssueInput | Promise<boolean | ValidationIssueInput>;
    /** Message overriding the native object-constraint default message. */
    message?: string;
    /** Validation groups in which this constraint should run. */
    groups?: string[];
};

/** Creates metadata for the native inline object-level constraint. */
export function createInlineObjectConstraintMetadata<TObject = unknown>(
    options: ObjectConstraintMetadataOptions<TObject>
): ConstraintMetadata<ObjectConstraintOptions<TObject>> {
    return createConstraintMetadata(
        'objectConstraint',
        {path: normalizeIssuePath(options.path), validator: options.validator as ObjectConstraintOptions<TObject>['validator']},
        {message: options.message, groups: options.groups}
    );
}

/** Creates metadata for a named reusable object-level constraint. */
export function createNamedObjectConstraintMetadata(
    name: string,
    metadata: ConstraintOptions = {}
): ConstraintMetadata {
    if (!name) throw new Error('Object constraint name is required.');
    return createConstraintMetadata(name, undefined, metadata);
}
function normalizeIssuePath(path: string | Array<string | number> | undefined): Array<string | number> | undefined {
    return typeof path === 'string' ? path.split('.').filter(Boolean) : path;
}