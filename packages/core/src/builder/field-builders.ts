import {cloneFieldMetadata, isModelMetadata} from '../metadata/clone';
import {upsertConstraintMetadata} from '../metadata/constraints';
import type {ConstraintMetadata, FieldMetadata, FieldType, ModelMetadata, UiMetadata} from '../metadata/types';

/**
 * Common interface implemented by all field builders.
 */
export interface FieldBuilder {
    /**
     * Builds immutable field metadata.
     *
     * @param name - Final field name.
     * @returns Field metadata for the supplied name.
     */
    build(name: string): FieldMetadata;
}

/**
 * Creates model metadata with the builder API.
 *
 * @param name - Public model name.
 * @param fields - Map of field builders keyed by field name.
 * @returns Complete Decorix model metadata.
 */
export function model(name: string, fields: Record<string, FieldBuilder>): ModelMetadata {
    return {
        name,
        fields: Object.entries(fields).map(([fieldName, builder]) => builder.build(fieldName))
    };
}

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
    required(message?: string): this {
        this.field.required = true;
        upsertConstraintMetadata(this.field as FieldMetadata, {kind: 'required', message});
        return this;
    }

    /** Marks the field as optional. */
    optional(): this {
        this.field.required = false;
        this.field.constraints = this.field.constraints.filter((constraint) => constraint.kind !== 'required');
        return this;
    }

    /** Sets the field label. */
    label(value: string): this {
        return this.ui({label: value});
    }

    /** Sets the field placeholder. */
    placeholder(value: string): this {
        return this.ui({placeholder: value});
    }

    /** Sets the field description. */
    description(value: string): this {
        return this.ui({description: value});
    }

    /** Sets whether the field is hidden. */
    hidden(value = true): this {
        return this.ui({hidden: value});
    }

    /** Sets whether the field is read-only. */
    readonly(value = true): this {
        return this.ui({readonly: value});
    }

    /** Sets the field display order. */
    order(value: number): this {
        return this.ui({order: value});
    }

    /** Sets the field group. */
    group(value: string): this {
        return this.ui({group: value});
    }

    /** Builds immutable field metadata for the supplied name. */
    build(name: string): FieldMetadata {
        return cloneFieldMetadata({name, ...this.field});
    }

    protected addConstraint(constraint: ConstraintMetadata): this {
        upsertConstraintMetadata(this.field as FieldMetadata, constraint);
        return this;
    }

    private ui(value: UiMetadata): this {
        this.field.ui = {...this.field.ui, ...value};
        return this;
    }
}

/** Builder for string fields. */
export class StringFieldBuilder extends BaseFieldBuilder {
    constructor() {
        super('string');
    }

    /** Adds a minimum string length constraint. */
    minLength(value: number, message?: string): this {
        return this.addConstraint({kind: 'minLength', value, message});
    }

    /** Adds a maximum string length constraint. */
    maxLength(value: number, message?: string): this {
        return this.addConstraint({kind: 'maxLength', value, message});
    }

    /** Adds an email format constraint. */
    email(message?: string): this {
        return this.addConstraint({kind: 'email', message});
    }

    /** Adds a regular expression constraint. */
    pattern(value: RegExp, message?: string): this {
        return this.addConstraint({kind: 'pattern', value, message});
    }
}

/** Builder for number fields. */
export class NumberFieldBuilder extends BaseFieldBuilder {
    constructor() {
        super('number');
    }

    /** Adds a minimum numeric constraint. */
    min(value: number, message?: string): this {
        return this.addConstraint({kind: 'min', value, message});
    }

    /** Adds a maximum numeric constraint. */
    max(value: number, message?: string): this {
        return this.addConstraint({kind: 'max', value, message});
    }
}

/** Builder for boolean fields. */
export class BooleanFieldBuilder extends BaseFieldBuilder {
    constructor() {
        super('boolean');
    }
}

/** Builder for date fields. */
export class DateFieldBuilder extends BaseFieldBuilder {
    constructor() {
        super('date');
    }
}

/** Builder for enum fields. */
export class EnumFieldBuilder extends BaseFieldBuilder {
    constructor(values: readonly [string, ...string[]]) {
        super('enum', {enumValues: values});
    }
}

/** Builder for array fields. */
export class ArrayFieldBuilder extends BaseFieldBuilder {
    constructor(item: FieldBuilder) {
        super('array', {item: item.build('$item')});
    }
}

/** Builder for object fields. */
export class ObjectFieldBuilder extends BaseFieldBuilder {
    constructor(fields: Record<string, FieldBuilder> | ModelMetadata) {
        const nested = isModelMetadata(fields)
            ? fields.fields
            : Object.entries(fields).map(([fieldName, builder]) => builder.build(fieldName));
        super('object', {fields: nested});
    }
}

/** Creates a string field builder. */
export function stringField(): StringFieldBuilder {
    return new StringFieldBuilder();
}

/** Creates a number field builder. */
export function numberField(): NumberFieldBuilder {
    return new NumberFieldBuilder();
}

/** Creates a boolean field builder. */
export function booleanField(): BooleanFieldBuilder {
    return new BooleanFieldBuilder();
}

/** Creates a date field builder. */
export function dateField(): DateFieldBuilder {
    return new DateFieldBuilder();
}

/** Creates an enum field builder. */
export function enumField(values: readonly [string, ...string[]]): EnumFieldBuilder {
    return new EnumFieldBuilder(values);
}

/** Creates an array field builder. */
export function arrayField(item: FieldBuilder): ArrayFieldBuilder {
    return new ArrayFieldBuilder(item);
}

/** Creates an object field builder. */
export function objectField(fields: Record<string, FieldBuilder> | ModelMetadata): ObjectFieldBuilder {
    return new ObjectFieldBuilder(fields);
}
