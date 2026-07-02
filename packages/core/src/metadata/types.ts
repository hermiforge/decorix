/**
 * Primitive and structural field kinds supported by Decorix metadata.
 *
 * Adapters use this neutral value to decide how to generate framework-specific
 * validators, schema properties, and form controls.
 */
export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array' | 'object';

/**
 * Validation constraint attached to a field or model object.
 */
export type ConstraintMetadata<TOptions = unknown> = {
    /** Registry name of the constraint definition. */
    name: string;
    /** Constraint-specific option payload. */
    options?: TOptions;
    /** User-facing message override. */
    message?: string;
    /** Validation groups in which this constraint should run. */
    groups?: string[];
};

/** JSON Schema fragment emitted by constraint definitions that have native schema support. */
export type JsonSchemaFragment = Record<string, unknown>;

/**
 * Runtime context passed to constraint definitions.
 */
export type ValidationContext<TValue = unknown> = {
    /** Root object currently being validated. */
    object: unknown;
    /** Property name for field constraints or model name for object constraints. */
    property?: string;
    /** Current field or object value passed to the constraint. */
    value: TValue;
    /** Active validation group, when one was requested. */
    group?: string;
    /** Active locale, when one was requested. */
    locale?: string;
    /** Per-validation service bag for custom constraints. */
    services?: Record<string, unknown>;
};

/**
 * Partial issue payload returned by custom constraint definitions.
 */
export type ValidationIssueInput = {
    /** Optional issue path override. Defaults to the current validation path. */
    path?: Array<string | number>;
    /** Optional stable issue code override. Defaults to decorix.<constraint>. */
    code?: string;
    /** Optional message override. Defaults to user or definition message. */
    message?: string;
    /** Optional issue parameters exposed to adapters. */
    params?: Record<string, unknown>;
};

/**
 * Executable definition registered for a Decorix constraint name.
 */
export type ConstraintDefinition<TValue = unknown, TOptions = unknown> = {
    /** Unique constraint name stored in metadata. */
    name: string;
    /** Whether the constraint validates one field or the whole object. */
    kind: 'field' | 'object';
    /** Marks definitions that require validateAsync or framework async support. */
    async?: boolean;
    /** Runs the constraint and returns true or a normalized issue payload. */
    validate(
        value: TValue,
        options: TOptions,
        context: ValidationContext<TValue>
    ): boolean | ValidationIssueInput | Promise<boolean | ValidationIssueInput>;
    /** Default message or message factory used when validation fails. */
    message?: string | ((options: TOptions, context: ValidationContext<TValue>) => string);
    /** Optional native JSON Schema conversion for schema-capable constraints. */
    toJsonSchema?: (options: TOptions, context: ValidationContext<TValue>) => JsonSchemaFragment | undefined;
};

/**
 * Framework-neutral user-interface hints for a field.
 *
 * These values intentionally describe intent instead of concrete widgets so
 * Angular, React, Vue, documentation, and schema adapters can interpret them.
 */
export type UiMetadata = {
    /** Human-readable label. */
    label?: string;
    /** Placeholder text for input-like controls. */
    placeholder?: string;
    /** Help or description text. */
    description?: string;
    /** Whether generated UI should hide the field. */
    hidden?: boolean;
    /** Whether generated UI should make the field read-only. */
    readonly?: boolean;
    /** Relative ordering hint. */
    order?: number;
    /** Named UI group hint. */
    group?: string;
};

/**
 * Metadata for one Decorix model field.
 *
 * Object, array, and enum fields carry the extra structural information needed
 * by adapters while keeping the top-level field contract stable.
 */
export type FieldMetadata = {
    /** Field property name. */
    name: string;
    /** Neutral field type understood by every adapter. */
    type: FieldType;
    /** Whether absent values should produce an implicit required issue. */
    required: boolean;
    /** Constraints attached to this field. */
    constraints: ConstraintMetadata[];
    /** Optional UI hints for generated forms and schemas. */
    ui?: UiMetadata;
    /** Nested object fields when type is object. */
    fields?: FieldMetadata[];
    /** Array item metadata when type is array. */
    item?: FieldMetadata;
    /** Enum values when type is enum. */
    enumValues?: readonly [string, ...string[]];
};

/**
 * Framework-neutral description of a business model.
 */
export type ModelMetadata = {
    /** Public model name. */
    name: string;
    /** Top-level field metadata. */
    fields: FieldMetadata[];
    /** Object-level constraints evaluated against the whole value. */
    objectConstraints?: ConstraintMetadata[];
};

/**
 * A constructor or function used as a registry key for decorator-declared models.
 */
export type ModelTarget = Function;