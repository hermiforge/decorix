import {createConstraint, createObjectConstraint} from './constraint-registry';
import type {ConstraintDefinition, ConditionalFieldOptions, FieldReferenceOptions, ObjectConstraintOptions} from '../metadata/types';

/** Regular expression used by the native email constraint. */
const EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEXP = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;
const UUID_REGEXP = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_REGEXP = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Returns true when a value should be treated as absent by nullable-aware native constraints. */
function nullable(value: unknown): boolean {
    return value === null || value === undefined;
}

/** Reads a string, array, map, set, or size-bearing value length for collection-like constraints. */
function length(value: unknown): number | undefined {
    if (typeof value === 'string' || Array.isArray(value)) return value.length;
    if (value instanceof Map || value instanceof Set) return value.size;
    const size = (value as {size?: unknown} | null)?.size;
    return typeof size === 'number' ? size : undefined;
}

/** Normalizes supported date inputs into epoch milliseconds for temporal constraints. */
function dateValue(value: unknown): number | undefined {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.getTime();
    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value).getTime();
        return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
}


/** Resolves a dot-path against the root object. */
function readPath(object: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((current, segment) => {
        if (current === null || current === undefined) return undefined;
        if (typeof current !== 'object') return undefined;
        return (current as Record<string, unknown>)[segment];
    }, object);
}

/** Returns true for null or undefined values that should skip comparison constraints. */
function missing(value: unknown): boolean {
    return value === null || value === undefined;
}

/** Runs a numeric field-to-field comparison. */
function compareNumber(value: unknown, options: FieldReferenceOptions, object: unknown, compare: (left: number, right: number) => boolean) {
    const peer = readPath(object, options.path);
    if (missing(value) || missing(peer)) return true;
    if (typeof value !== 'number' || typeof peer !== 'number') return typeFail('number');
    return compare(value, peer) || false;
}

/** Runs a date-like field-to-field comparison. */
function compareDate(value: unknown, options: FieldReferenceOptions, object: unknown, compare: (left: number, right: number) => boolean) {
    const peer = readPath(object, options.path);
    if (missing(value) || missing(peer)) return true;
    const left = dateValue(value);
    const right = dateValue(peer);
    if (left === undefined || right === undefined) return typeFail('date');
    return compare(left, right) || false;
}
/** Builds a normalized type-mismatch issue payload for native constraints. */
function typeFail(expected: string) {
    return {code: 'decorix.type', params: {expected}};
}

/** Registers a field-level native constraint in the default registry. */
function field<TOptions>(definition: Omit<ConstraintDefinition<unknown, TOptions>, 'kind'>): void {
    createConstraint({...definition, kind: 'field'});
}
/** Registers an object-level native constraint in the default registry. */
function object<TOptions>(definition: Omit<ConstraintDefinition<unknown, TOptions>, 'kind'>): void {
    createObjectConstraint({...definition, kind: 'object'});
}

/**
 * Registers the built-in Decorix constraint definitions.
 *
 * The groups below cover presence/nullity, strings, numbers, dates, collections,
 * and enum membership so every package can fall back to the same semantics.
 */
export function registerNativeConstraints(): void {
    const defs: Array<() => void> = [
        () => object<ObjectConstraintOptions>({name: 'objectConstraint', validate: (value, options, context) => { const result = options.validator(value, context); if (result instanceof Promise) return result; if (result === true) return true; if (result === false) return {path: options.path ?? []}; return {...result, path: result.path ?? options.path ?? []}; }, message: 'Object failed validation.'}),
        // Presence and nullity constraints define when absent values are allowed or rejected.
        () => field({name: 'required', validate: (value) => value !== null && value !== undefined, message: 'Value is required.'}),
        () => field({name: 'optional', validate: () => true, message: 'Value is optional.'}),
        () => field({name: 'nullable', validate: () => true, message: 'Value may be null.'}),
        () => field({name: 'notNull', validate: (value) => value !== null, message: 'Value must not be null.'}),
        () => field({name: 'notUndefined', validate: (value) => value !== undefined, message: 'Value must not be undefined.'}),
        () => field({name: 'notEmpty', validate: (value) => nullable(value) || (length(value) !== undefined ? length(value)! > 0 : typeFail('sized')), message: 'Value must not be empty.'}),
        () => field({name: 'notBlank', validate: (value) => nullable(value) || (typeof value === 'string' ? value.trim().length > 0 : typeFail('string')), message: 'Value must not be blank.'}),
        () => field<FieldReferenceOptions>({name: 'equalsField', validate: (value, options, context) => { const peer = readPath(context.object, options.path); return missing(value) || missing(peer) || Object.is(value, peer); }, message: 'Value must equal the referenced field.'}),
        () => field<FieldReferenceOptions>({name: 'notEqualsField', validate: (value, options, context) => { const peer = readPath(context.object, options.path); return missing(value) || missing(peer) || !Object.is(value, peer); }, message: 'Value must not equal the referenced field.'}),
        () => field<FieldReferenceOptions>({name: 'greaterThanField', validate: (value, options, context) => compareNumber(value, options, context.object, (left, right) => left > right), message: 'Value must be greater than the referenced field.'}),
        () => field<FieldReferenceOptions>({name: 'greaterOrEqualField', validate: (value, options, context) => compareNumber(value, options, context.object, (left, right) => left >= right), message: 'Value must be greater than or equal to the referenced field.'}),
        () => field<FieldReferenceOptions>({name: 'lessThanField', validate: (value, options, context) => compareNumber(value, options, context.object, (left, right) => left < right), message: 'Value must be less than the referenced field.'}),
        () => field<FieldReferenceOptions>({name: 'lessOrEqualField', validate: (value, options, context) => compareNumber(value, options, context.object, (left, right) => left <= right), message: 'Value must be less than or equal to the referenced field.'}),
        () => field<FieldReferenceOptions>({name: 'beforeField', validate: (value, options, context) => compareDate(value, options, context.object, (left, right) => left < right), message: 'Value must be before the referenced field.'}),
        () => field<FieldReferenceOptions>({name: 'afterField', validate: (value, options, context) => compareDate(value, options, context.object, (left, right) => left > right), message: 'Value must be after the referenced field.'}),
        () => field<ConditionalFieldOptions>({name: 'requiredIf', validate: (value, options, context) => options.predicate(context.object) ? value !== null && value !== undefined : true, message: 'Value is required.'}),
        () => field<ConditionalFieldOptions>({name: 'forbiddenIf', validate: (value, options, context) => options.predicate(context.object) ? value === null || value === undefined : true, message: 'Value is forbidden.'}),
        // String constraints validate textual shape, length, casing, and common formats.
        () => field<number>({name: 'minLength', validate: (value, min) => nullable(value) || (typeof value === 'string' ? value.length >= min : typeFail('string')), message: (min) => `Value must be at least ${min} characters.`, toJsonSchema: (min) => ({minLength: min})}),
        () => field<number>({name: 'maxLength', validate: (value, max) => nullable(value) || (typeof value === 'string' ? value.length <= max : typeFail('string')), message: (max) => `Value must be at most ${max} characters.`, toJsonSchema: (max) => ({maxLength: max})}),
        () => field<{min: number; max: number}>({name: 'length', validate: (value, options) => nullable(value) || (typeof value === 'string' ? value.length >= options.min && value.length <= options.max : typeFail('string')), message: (o) => `Value must be between ${o.min} and ${o.max} characters.`, toJsonSchema: (o) => ({minLength: o.min, maxLength: o.max})}),
        () => field<RegExp>({name: 'pattern', validate: (value, pattern) => { if (nullable(value)) return true; if (typeof value !== 'string') return typeFail('string'); pattern.lastIndex = 0; const ok = pattern.test(value); pattern.lastIndex = 0; return ok; }, message: 'Value does not match the required pattern.', toJsonSchema: (pattern) => ({pattern: pattern.source})}),
        () => field({name: 'email', validate: (value) => nullable(value) || (typeof value === 'string' ? EMAIL_REGEXP.test(value) : typeFail('string')), message: 'Value must be a valid email address.', toJsonSchema: () => ({format: 'email'})}),
        () => field({name: 'url', validate: (value) => nullable(value) || (typeof value === 'string' ? URL_REGEXP.test(value) : typeFail('string')), message: 'Value must be a valid URL.', toJsonSchema: () => ({format: 'uri'})}),
        () => field({name: 'uuid', validate: (value) => nullable(value) || (typeof value === 'string' ? UUID_REGEXP.test(value) : typeFail('string')), message: 'Value must be a valid UUID.', toJsonSchema: () => ({format: 'uuid'})}),
        () => field({name: 'slug', validate: (value) => nullable(value) || (typeof value === 'string' ? SLUG_REGEXP.test(value) : typeFail('string')), message: 'Value must be a valid slug.'}),
        () => field<string>({name: 'startsWith', validate: (value, prefix) => nullable(value) || (typeof value === 'string' ? value.startsWith(prefix) : typeFail('string')), message: (prefix) => `Value must start with ${prefix}.`}),
        () => field<string>({name: 'endsWith', validate: (value, suffix) => nullable(value) || (typeof value === 'string' ? value.endsWith(suffix) : typeFail('string')), message: (suffix) => `Value must end with ${suffix}.`}),
        () => field<string>({name: 'contains', validate: (value, needle) => nullable(value) || (typeof value === 'string' ? value.includes(needle) : typeFail('string')), message: (needle) => `Value must contain ${needle}.`}),
        () => field({name: 'lowercase', validate: (value) => nullable(value) || (typeof value === 'string' ? value === value.toLowerCase() : typeFail('string')), message: 'Value must be lowercase.'}),
        () => field({name: 'uppercase', validate: (value) => nullable(value) || (typeof value === 'string' ? value === value.toUpperCase() : typeFail('string')), message: 'Value must be uppercase.'}),
        // Number constraints validate numeric ranges and arithmetic properties.
        () => field<number>({name: 'min', validate: (value, min) => nullable(value) || (typeof value === 'number' ? value >= min : typeFail('number')), message: (min) => `Value must be at least ${min}.`, toJsonSchema: (min) => ({minimum: min})}),
        () => field<number>({name: 'max', validate: (value, max) => nullable(value) || (typeof value === 'number' ? value <= max : typeFail('number')), message: (max) => `Value must be at most ${max}.`, toJsonSchema: (max) => ({maximum: max})}),
        () => field<{min: number; max: number}>({name: 'between', validate: (value, o) => nullable(value) || (typeof value === 'number' ? value >= o.min && value <= o.max : typeFail('number')), message: (o) => `Value must be between ${o.min} and ${o.max}.`, toJsonSchema: (o) => ({minimum: o.min, maximum: o.max})}),
        () => field({name: 'positive', validate: (value) => nullable(value) || (typeof value === 'number' ? value > 0 : typeFail('number')), message: 'Value must be positive.'}),
        () => field({name: 'positiveOrZero', validate: (value) => nullable(value) || (typeof value === 'number' ? value >= 0 : typeFail('number')), message: 'Value must be positive or zero.'}),
        () => field({name: 'negative', validate: (value) => nullable(value) || (typeof value === 'number' ? value < 0 : typeFail('number')), message: 'Value must be negative.'}),
        () => field({name: 'negativeOrZero', validate: (value) => nullable(value) || (typeof value === 'number' ? value <= 0 : typeFail('number')), message: 'Value must be negative or zero.'}),
        () => field({name: 'integer', validate: (value) => nullable(value) || (typeof value === 'number' ? Number.isInteger(value) : typeFail('number')), message: 'Value must be an integer.', toJsonSchema: () => ({type: 'integer'})}),
        () => field({name: 'finite', validate: (value) => nullable(value) || (typeof value === 'number' ? Number.isFinite(value) : typeFail('number')), message: 'Value must be finite.'}),
        () => field<number>({name: 'multipleOf', validate: (value, factor) => nullable(value) || (typeof value === 'number' ? value % factor === 0 : typeFail('number')), message: (factor) => `Value must be a multiple of ${factor}.`, toJsonSchema: (factor) => ({multipleOf: factor})}),
        // Date constraints compare Date, string, and number inputs after timestamp normalization.
        () => field({name: 'past', validate: (value) => nullable(value) || ((dateValue(value) ?? Number.POSITIVE_INFINITY) < Date.now()), message: 'Value must be in the past.'}),
        () => field({name: 'pastOrPresent', validate: (value) => nullable(value) || ((dateValue(value) ?? Number.POSITIVE_INFINITY) <= Date.now()), message: 'Value must be in the past or present.'}),
        () => field({name: 'future', validate: (value) => nullable(value) || ((dateValue(value) ?? Number.NEGATIVE_INFINITY) > Date.now()), message: 'Value must be in the future.'}),
        () => field({name: 'futureOrPresent', validate: (value) => nullable(value) || ((dateValue(value) ?? Number.NEGATIVE_INFINITY) >= Date.now()), message: 'Value must be in the future or present.'}),
        () => field<Date | string | number>({name: 'before', validate: (value, target) => nullable(value) || ((dateValue(value) ?? Number.POSITIVE_INFINITY) < (dateValue(target) ?? Number.NEGATIVE_INFINITY)), message: 'Value must be before the target date.'}),
        () => field<Date | string | number>({name: 'after', validate: (value, target) => nullable(value) || ((dateValue(value) ?? Number.NEGATIVE_INFINITY) > (dateValue(target) ?? Number.POSITIVE_INFINITY)), message: 'Value must be after the target date.'}),
        () => field<{min: Date | string | number; max: Date | string | number}>({name: 'betweenDates', validate: (value, o) => { const current = dateValue(value); return nullable(value) || (current !== undefined && current >= (dateValue(o.min) ?? Number.POSITIVE_INFINITY) && current <= (dateValue(o.max) ?? Number.NEGATIVE_INFINITY)); }, message: 'Value must be between the target dates.'}),
        // Collection constraints validate array cardinality and uniqueness.
        () => field<number>({name: 'minItems', validate: (value, min) => nullable(value) || (Array.isArray(value) ? value.length >= min : typeFail('array')), message: (min) => `Value must contain at least ${min} items.`, toJsonSchema: (min) => ({minItems: min})}),
        () => field<number>({name: 'maxItems', validate: (value, max) => nullable(value) || (Array.isArray(value) ? value.length <= max : typeFail('array')), message: (max) => `Value must contain at most ${max} items.`, toJsonSchema: (max) => ({maxItems: max})}),
        () => field<{min: number; max: number}>({name: 'size', validate: (value, o) => nullable(value) || (Array.isArray(value) ? value.length >= o.min && value.length <= o.max : typeFail('array')), message: (o) => `Value must contain between ${o.min} and ${o.max} items.`, toJsonSchema: (o) => ({minItems: o.min, maxItems: o.max})}),
        () => field({name: 'uniqueItems', validate: (value) => nullable(value) || (Array.isArray(value) ? new Set(value).size === value.length : typeFail('array')), message: 'Value must contain unique items.', toJsonSchema: () => ({uniqueItems: true})}),
        () => field({name: 'notEmptyArray', validate: (value) => nullable(value) || (Array.isArray(value) ? value.length > 0 : typeFail('array')), message: 'Array must not be empty.'}),
        // Enum constraints validate membership and forbidden values.
        () => field<readonly unknown[]>({name: 'enum', validate: (value, values) => nullable(value) || values.includes(value), message: 'Value must be one of the allowed values.', toJsonSchema: (values) => ({enum: values})}),
        () => field<readonly unknown[]>({name: 'oneOf', validate: (value, values) => nullable(value) || values.includes(value), message: 'Value must be one of the allowed values.', toJsonSchema: (values) => ({enum: values})}),
        () => field<readonly unknown[]>({name: 'notOneOf', validate: (value, values) => nullable(value) || !values.includes(value), message: 'Value must not be one of the forbidden values.', toJsonSchema: (values) => ({not: {enum: values}})})
    ];

    for (const register of defs) {
        try {
            register();
        } catch (error) {
            if (!(error instanceof Error) || !error.message.includes('already registered')) {
                throw error;
            }
        }
    }
}

registerNativeConstraints();

