import type {ConstraintMetadata, FieldMetadata, ModelMetadata} from '@hermiforge-decorix/core';

/** Mirrors Superforms' own `InputConstraint` shape (`sveltekit-superforms/jsonSchema/constraints`). */
export type SuperformsInputConstraint = Partial<{
    pattern: string;
    min: number | string;
    max: number | string;
    required: boolean;
    step: number | 'any';
    minlength: number;
    maxlength: number;
}>;

/** Recursive tree of per-field HTML input constraints, mirroring `InputConstraints<T>`. */
export type SuperformsConstraints = {[key: string]: SuperformsInputConstraint | SuperformsConstraints};

/** Recursive tree marking which fields are arrays/objects, mirroring Superforms' `SchemaShape`. */
export type SuperformsShape = {[key: string]: SuperformsShape};

/**
 * Builds the HTML input constraints Superforms exposes as `$constraints` for
 * each field, directly from Decorix field metadata rather than from a JSON
 * Schema (Superforms' own `constraints(jsonSchema)` helper is not part of
 * `sveltekit-superforms/adapters`'s public API — verified against the
 * installed package).
 */
export function constraintsForModel(metadata: ModelMetadata): SuperformsConstraints {
    return constraintsForFields(metadata.fields);
}

function constraintsForFields(fields: FieldMetadata[]): SuperformsConstraints {
    const result: SuperformsConstraints = {};
    for (const field of fields) {
        if (field.type === 'object') {
            result[field.name] = constraintsForFields(field.fields ?? []);
            continue;
        }
        const constraint = constraintForField(field);
        if (constraint) result[field.name] = constraint;
    }
    return result;
}

function constraintForField(field: FieldMetadata): SuperformsInputConstraint | undefined {
    const constraint: SuperformsInputConstraint = {};
    if (field.required) constraint.required = true;
    for (const meta of field.constraints) {
        applyConstraint(constraint, meta);
    }
    return Object.keys(constraint).length ? constraint : undefined;
}

function applyConstraint(constraint: SuperformsInputConstraint, meta: ConstraintMetadata): void {
    switch (meta.name) {
        case 'minLength':
            constraint.minlength = Number(meta.options);
            break;
        case 'maxLength':
            constraint.maxlength = Number(meta.options);
            break;
        case 'min':
            constraint.min = Number(meta.options);
            break;
        case 'max':
            constraint.max = Number(meta.options);
            break;
        case 'pattern':
            constraint.pattern = (meta.options as RegExp).source;
            break;
    }
}

/**
 * Builds the tree Superforms uses to know whether a path is an array/object
 * (for error mapping), directly from Decorix field metadata.
 */
export function shapeForModel(metadata: ModelMetadata): SuperformsShape {
    return shapeForFields(metadata.fields);
}

function shapeForFields(fields: FieldMetadata[]): SuperformsShape {
    const shape: SuperformsShape = {};
    for (const field of fields) {
        if (field.type === 'object') {
            shape[field.name] = shapeForFields(field.fields ?? []);
        } else if (field.type === 'array') {
            shape[field.name] = field.item?.type === 'object' ? shapeForFields(field.item.fields ?? []) : {};
        }
    }
    return shape;
}
