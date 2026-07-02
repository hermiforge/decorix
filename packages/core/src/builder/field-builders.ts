import {cloneFieldMetadata, isModelMetadata} from '../metadata/clone';
import {createConstraintMetadata, normalizeConstraintOptions, removeConstraintMetadata, upsertConstraintMetadata, type ConstraintOptions} from '../metadata/constraints';
import type {ConstraintMetadata, FieldMetadata, FieldType, ModelMetadata, UiMetadata} from '../metadata/types';

/** Message/group options accepted by builder constraint methods. */
type OptionsArg = string | ConstraintOptions;

/**
 * Common interface implemented by all field builders.
 */
export interface FieldBuilder {
    /** Builds immutable field metadata for the supplied field name. */
    build(name: string): FieldMetadata;
}

/**
 * Creates model metadata with the builder API.
 */
export function model(name: string, fields: Record<string, FieldBuilder>): ModelMetadata {
    return {
        name,
        fields: Object.entries(fields).map(([fieldName, builder]) => builder.build(fieldName))
    };
}

/** Shared fluent behavior used by all concrete field builders. */
class BaseFieldBuilder implements FieldBuilder {
    protected readonly field: Omit<FieldMetadata, 'name'>;

    constructor(type: FieldType, field?: Partial<Omit<FieldMetadata, 'name'>>) {
        this.field = {
            type,
            required: true,
            constraints: [],
            ...field
        };
    }

    /** Marks the field as required and optionally sets the required message. */
    required(options?: OptionsArg): this {
        this.field.required = true;
        return this.addConstraintName('required', undefined, options);
    }

    /** Marks the field as optional and removes any explicit required constraint. */
    optional(options?: OptionsArg): this {
        this.field.required = false;
        removeConstraintMetadata(this.field as FieldMetadata, 'required');
        return this.addConstraintName('optional', undefined, options);
    }

    /** Allows null and skips non-presence validation for null values. */
    nullable(options?: OptionsArg): this { return this.addConstraintName('nullable', undefined, options); }
    /** Rejects null values. */
    notNull(options?: OptionsArg): this { return this.addConstraintName('notNull', undefined, options); }
    /** Rejects undefined values. */
    notUndefined(options?: OptionsArg): this { return this.addConstraintName('notUndefined', undefined, options); }
    /** Requires a string, array, map, set, or sized value to contain at least one item. */
    notEmpty(options?: OptionsArg): this { return this.addConstraintName('notEmpty', undefined, options); }
    /** Requires a value to be one of the supplied allowed values. */
    oneOf(values: readonly unknown[], options?: OptionsArg): this { return this.addConstraintName('oneOf', values, options); }
    /** Requires a value not to be one of the supplied forbidden values. */
    notOneOf(values: readonly unknown[], options?: OptionsArg): this { return this.addConstraintName('notOneOf', values, options); }

    /** Sets the field label. */
    label(value: string): this { return this.ui({label: value}); }
    /** Sets the field placeholder. */
    placeholder(value: string): this { return this.ui({placeholder: value}); }
    /** Sets the field description. */
    description(value: string): this { return this.ui({description: value}); }
    /** Sets whether the field is hidden. */
    hidden(value = true): this { return this.ui({hidden: value}); }
    /** Sets whether the field is read-only. */
    readonly(value = true): this { return this.ui({readonly: value}); }
    /** Sets the field display order. */
    order(value: number): this { return this.ui({order: value}); }
    /** Sets the field group. */
    group(value: string): this { return this.ui({group: value}); }

    /** Builds immutable field metadata for the supplied name. */
    build(name: string): FieldMetadata {
        return cloneFieldMetadata({name, ...this.field});
    }

    /** Adds or replaces a constraint while preserving fluent builder chaining. */
    protected addConstraint(constraint: ConstraintMetadata): this {
        upsertConstraintMetadata(this.field as FieldMetadata, constraint);
        return this;
    }

    /** Converts overload-friendly arguments into normalized constraint metadata. */
    protected addConstraintName(name: string, options?: unknown, arg?: OptionsArg): this {
        return this.addConstraint(createConstraintMetadata(name, options, normalizeConstraintOptions(arg)));
    }

    /** Merges UI metadata without discarding previously configured hints. */
    private ui(value: UiMetadata): this {
        this.field.ui = {...this.field.ui, ...value};
        return this;
    }
}

/** Builder for string fields. */
export class StringFieldBuilder extends BaseFieldBuilder {
    /** Creates a string field builder. */
    constructor() { super('string'); }
    /** Requires the string to have at least the supplied character count. */
    minLength(value: number, options?: OptionsArg): this { return this.addConstraintName('minLength', value, options); }
    /** Requires the string to have at most the supplied character count. */
    maxLength(value: number, options?: OptionsArg): this { return this.addConstraintName('maxLength', value, options); }
    /** Requires the string length to stay within the inclusive range. */
    length(min: number, max: number, options?: OptionsArg): this { return this.addConstraintName('length', {min, max}, options); }
    /** Requires the string to look like an email address. */
    email(options?: OptionsArg): this { return this.addConstraintName('email', undefined, options); }
    /** Requires the string to look like an absolute HTTP or HTTPS URL. */
    url(options?: OptionsArg): this { return this.addConstraintName('url', undefined, options); }
    /** Requires the string to look like a UUID. */
    uuid(options?: OptionsArg): this { return this.addConstraintName('uuid', undefined, options); }
    /** Requires the string to use lowercase slug syntax. */
    slug(options?: OptionsArg): this { return this.addConstraintName('slug', undefined, options); }
    /** Requires the string to match the supplied regular expression. */
    pattern(value: RegExp, options?: OptionsArg): this { return this.addConstraintName('pattern', value, options); }
    /** Requires the string to start with the supplied prefix. */
    startsWith(value: string, options?: OptionsArg): this { return this.addConstraintName('startsWith', value, options); }
    /** Requires the string to end with the supplied suffix. */
    endsWith(value: string, options?: OptionsArg): this { return this.addConstraintName('endsWith', value, options); }
    /** Requires the string to contain the supplied substring. */
    contains(value: string, options?: OptionsArg): this { return this.addConstraintName('contains', value, options); }
    /** Requires the string to already be lowercase. */
    lowercase(options?: OptionsArg): this { return this.addConstraintName('lowercase', undefined, options); }
    /** Requires the string to already be uppercase. */
    uppercase(options?: OptionsArg): this { return this.addConstraintName('uppercase', undefined, options); }
    /** Requires the string to contain non-whitespace text. */
    notBlank(options?: OptionsArg): this { return this.addConstraintName('notBlank', undefined, options); }
}

/** Builder for number fields. */
export class NumberFieldBuilder extends BaseFieldBuilder {
    /** Creates a number field builder. */
    constructor() { super('number'); }
    /** Requires the number to be greater than or equal to the supplied minimum. */
    min(value: number, options?: OptionsArg): this { return this.addConstraintName('min', value, options); }
    /** Requires the number to be less than or equal to the supplied maximum. */
    max(value: number, options?: OptionsArg): this { return this.addConstraintName('max', value, options); }
    /** Requires the number to stay within the inclusive range. */
    between(min: number, max: number, options?: OptionsArg): this { return this.addConstraintName('between', {min, max}, options); }
    /** Requires the number to be greater than zero. */
    positive(options?: OptionsArg): this { return this.addConstraintName('positive', undefined, options); }
    /** Requires the number to be greater than or equal to zero. */
    positiveOrZero(options?: OptionsArg): this { return this.addConstraintName('positiveOrZero', undefined, options); }
    /** Requires the number to be less than zero. */
    negative(options?: OptionsArg): this { return this.addConstraintName('negative', undefined, options); }
    /** Requires the number to be less than or equal to zero. */
    negativeOrZero(options?: OptionsArg): this { return this.addConstraintName('negativeOrZero', undefined, options); }
    /** Requires the number to be an integer. */
    integer(options?: OptionsArg): this { return this.addConstraintName('integer', undefined, options); }
    /** Requires the number to be finite. */
    finite(options?: OptionsArg): this { return this.addConstraintName('finite', undefined, options); }
    /** Requires the number to be evenly divisible by the supplied factor. */
    multipleOf(value: number, options?: OptionsArg): this { return this.addConstraintName('multipleOf', value, options); }
}

/** Builder for boolean fields. */
export class BooleanFieldBuilder extends BaseFieldBuilder {
    /** Creates a boolean field builder. */
    constructor() { super('boolean'); }
}

/** Builder for date fields. */
export class DateFieldBuilder extends BaseFieldBuilder {
    /** Creates a date field builder. */
    constructor() { super('date'); }
    /** Requires the date-like value to be before the current time. */
    past(options?: OptionsArg): this { return this.addConstraintName('past', undefined, options); }
    /** Requires the date-like value to be before or equal to the current time. */
    pastOrPresent(options?: OptionsArg): this { return this.addConstraintName('pastOrPresent', undefined, options); }
    /** Requires the date-like value to be after the current time. */
    future(options?: OptionsArg): this { return this.addConstraintName('future', undefined, options); }
    /** Requires the date-like value to be after or equal to the current time. */
    futureOrPresent(options?: OptionsArg): this { return this.addConstraintName('futureOrPresent', undefined, options); }
    /** Requires the date-like value to be before the supplied target. */
    before(value: Date | string | number, options?: OptionsArg): this { return this.addConstraintName('before', value, options); }
    /** Requires the date-like value to be after the supplied target. */
    after(value: Date | string | number, options?: OptionsArg): this { return this.addConstraintName('after', value, options); }
    /** Requires the date-like value to stay within the inclusive date range. */
    betweenDates(min: Date | string | number, max: Date | string | number, options?: OptionsArg): this { return this.addConstraintName('betweenDates', {min, max}, options); }
}

/** Builder for enum fields. */
export class EnumFieldBuilder extends BaseFieldBuilder {
    /** Creates an enum builder and records the allowed enum values as a constraint. */
    constructor(values: readonly [string, ...string[]]) {
        super('enum', {enumValues: values, constraints: [createConstraintMetadata('enum', values)]});
    }
}

/** Builder for array fields. */
export class ArrayFieldBuilder extends BaseFieldBuilder {
    /** Creates an array builder with item metadata from another field builder. */
    constructor(item: FieldBuilder) {
        super('array', {item: item.build('$item')});
    }
    /** Requires the array to contain at least the supplied item count. */
    minItems(value: number, options?: OptionsArg): this { return this.addConstraintName('minItems', value, options); }
    /** Requires the array to contain at most the supplied item count. */
    maxItems(value: number, options?: OptionsArg): this { return this.addConstraintName('maxItems', value, options); }
    /** Requires the array size to stay within the inclusive range. */
    size(min: number, max: number, options?: OptionsArg): this { return this.addConstraintName('size', {min, max}, options); }
    /** Requires array items to be unique according to Set equality. */
    uniqueItems(options?: OptionsArg): this { return this.addConstraintName('uniqueItems', undefined, options); }
    /** Requires the array to contain at least one item. */
    notEmptyArray(options?: OptionsArg): this { return this.addConstraintName('notEmptyArray', undefined, options); }
}

/** Builder for object fields. */
export class ObjectFieldBuilder extends BaseFieldBuilder {
    /** Creates an object builder from nested builders or existing model metadata. */
    constructor(fields: Record<string, FieldBuilder> | ModelMetadata) {
        // Existing model metadata can be embedded directly; builder maps must be materialized field by field.
        const nested = isModelMetadata(fields)
            ? fields.fields
            : Object.entries(fields).map(([fieldName, builder]) => builder.build(fieldName));
        super('object', {fields: nested});
    }
}

/** Creates a string field builder. */
export function stringField(): StringFieldBuilder { return new StringFieldBuilder(); }
/** Creates a number field builder. */
export function numberField(): NumberFieldBuilder { return new NumberFieldBuilder(); }
/** Creates a boolean field builder. */
export function booleanField(): BooleanFieldBuilder { return new BooleanFieldBuilder(); }
/** Creates a date field builder. */
export function dateField(): DateFieldBuilder { return new DateFieldBuilder(); }
/** Creates an enum field builder. */
export function enumField(values: readonly [string, ...string[]]): EnumFieldBuilder { return new EnumFieldBuilder(values); }
/** Creates an array field builder. */
export function arrayField(item: FieldBuilder): ArrayFieldBuilder { return new ArrayFieldBuilder(item); }
/** Creates an object field builder. */
export function objectField(fields: Record<string, FieldBuilder> | ModelMetadata): ObjectFieldBuilder { return new ObjectFieldBuilder(fields); }