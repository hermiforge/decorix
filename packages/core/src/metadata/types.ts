/**
 * Primitive and structural field kinds supported by Decorix metadata.
 *
 * Adapters use this neutral value to decide how to generate framework-specific
 * validators, schema properties, and form controls.
 */
export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array' | 'object';

/**
 * Validation constraint attached to a field.
 *
 * Constraint messages are stored as neutral strings so every adapter can
 * forward them to its target runtime without depending on framework-specific
 * metadata.
 */
export type ConstraintMetadata =
    | { kind: 'required'; message?: string }
    | { kind: 'minLength'; value: number; message?: string }
    | { kind: 'maxLength'; value: number; message?: string }
    | { kind: 'min'; value: number; message?: string }
    | { kind: 'max'; value: number; message?: string }
    | { kind: 'email'; message?: string }
    | { kind: 'pattern'; value: RegExp; message?: string };

/**
 * Framework-neutral user-interface hints for a field.
 *
 * These values intentionally describe intent instead of concrete widgets so
 * Angular, React, Vue, documentation, and schema adapters can interpret them.
 */
export type UiMetadata = {
    label?: string;
    placeholder?: string;
    description?: string;
    hidden?: boolean;
    readonly?: boolean;
    order?: number;
    group?: string;
};

/**
 * Metadata for one Decorix model field.
 *
 * Object, array, and enum fields carry the extra structural information needed
 * by adapters while keeping the top-level field contract stable.
 */
export type FieldMetadata = {
    name: string;
    type: FieldType;
    required: boolean;
    constraints: ConstraintMetadata[];
    ui?: UiMetadata;
    fields?: FieldMetadata[];
    item?: FieldMetadata;
    enumValues?: readonly [string, ...string[]];
};

/**
 * Framework-neutral description of a business model.
 */
export type ModelMetadata = {
    name: string;
    fields: FieldMetadata[];
};

/**
 * A constructor or function used as a registry key for decorator-declared models.
 */
export type ModelTarget = Function;
