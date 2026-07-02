import {createConstraintMetadata, normalizeConstraintOptions, upsertConstraintMetadata, type ConstraintOptions} from '../metadata/constraints';
import {fieldDecorator} from './common';

/** Message/group options accepted by constraint decorators. */
type OptionsArg = string | ConstraintOptions;
/** Inclusive numeric range used by range-based decorators. */
type Range = {min: number; max: number};
/** Inclusive date range used by date-range decorators. */
type DateRange = {min: Date | string | number; max: Date | string | number};

/**
 * Adds a constraint without changing the field's inferred type.
 */
function add(name: string, options?: unknown, arg?: OptionsArg): PropertyDecorator {
    return fieldDecorator((field) => {
        upsertConstraintMetadata(field, createConstraintMetadata(name, options, normalizeConstraintOptions(arg)));
    });
}

/**
 * Adds a constraint and pins the field type expected by adapters.
 */
function typed(type: 'string' | 'number' | 'date' | 'array' | 'enum', name: string, options?: unknown, arg?: OptionsArg): PropertyDecorator {
    return fieldDecorator((field) => {
        field.type = type;
        upsertConstraintMetadata(field, createConstraintMetadata(name, options, normalizeConstraintOptions(arg)));
    });
}

/** Marks a property as required and optionally stores a custom required message. */
export function Required(options?: OptionsArg): PropertyDecorator {
    return fieldDecorator((field) => {
        field.required = true;
        upsertConstraintMetadata(field, createConstraintMetadata('required', undefined, normalizeConstraintOptions(options)));
    });
}

/** Marks a property as optional and records the optional constraint. */
export function Optional(options?: OptionsArg): PropertyDecorator {
    return fieldDecorator((field) => {
        field.required = false;
        upsertConstraintMetadata(field, createConstraintMetadata('optional', undefined, normalizeConstraintOptions(options)));
    });
}

/** Allows a property to be null and skip non-presence constraints for null values. */
export function Nullable(options?: OptionsArg): PropertyDecorator { return add('nullable', undefined, options); }
/** Rejects null while still allowing other values through subsequent constraints. */
export function NotNull(options?: OptionsArg): PropertyDecorator { return add('notNull', undefined, options); }
/** Rejects undefined while still allowing other values through subsequent constraints. */
export function NotUndefined(options?: OptionsArg): PropertyDecorator { return add('notUndefined', undefined, options); }
/** Requires a string, array, map, set, or sized value to contain at least one item. */
export function NotEmpty(options?: OptionsArg): PropertyDecorator { return add('notEmpty', undefined, options); }
/** Requires a string value to contain non-whitespace text. */
export function NotBlank(options?: OptionsArg): PropertyDecorator { return typed('string', 'notBlank', undefined, options); }

/** Requires a string to have at least the supplied character count. */
export function MinLength(value: number, options?: OptionsArg): PropertyDecorator { return typed('string', 'minLength', value, options); }
/** Requires a string to have at most the supplied character count. */
export function MaxLength(value: number, options?: OptionsArg): PropertyDecorator { return typed('string', 'maxLength', value, options); }
/** Requires a string length to stay within the inclusive range. */
export function Length(min: number, max: number, options?: OptionsArg): PropertyDecorator { return typed('string', 'length', {min, max} satisfies Range, options); }
/** Requires a string to match the supplied regular expression. */
export function Pattern(value: RegExp, options?: OptionsArg): PropertyDecorator { return typed('string', 'pattern', value, options); }
/** Requires a string to look like an email address. */
export function Email(options?: OptionsArg): PropertyDecorator { return typed('string', 'email', undefined, options); }
/** Requires a string to look like an absolute HTTP or HTTPS URL. */
export function Url(options?: OptionsArg): PropertyDecorator { return typed('string', 'url', undefined, options); }
/** Requires a string to look like a UUID. */
export function Uuid(options?: OptionsArg): PropertyDecorator { return typed('string', 'uuid', undefined, options); }
/** Requires a string to use lowercase slug syntax. */
export function Slug(options?: OptionsArg): PropertyDecorator { return typed('string', 'slug', undefined, options); }
/** Requires a string to start with the supplied prefix. */
export function StartsWith(prefix: string, options?: OptionsArg): PropertyDecorator { return typed('string', 'startsWith', prefix, options); }
/** Requires a string to end with the supplied suffix. */
export function EndsWith(suffix: string, options?: OptionsArg): PropertyDecorator { return typed('string', 'endsWith', suffix, options); }
/** Requires a string to contain the supplied substring. */
export function Contains(value: string, options?: OptionsArg): PropertyDecorator { return typed('string', 'contains', value, options); }
/** Requires a string to already be lowercase. */
export function Lowercase(options?: OptionsArg): PropertyDecorator { return typed('string', 'lowercase', undefined, options); }
/** Requires a string to already be uppercase. */
export function Uppercase(options?: OptionsArg): PropertyDecorator { return typed('string', 'uppercase', undefined, options); }

/** Requires a number to be greater than or equal to the supplied minimum. */
export function Min(value: number, options?: OptionsArg): PropertyDecorator { return typed('number', 'min', value, options); }
/** Requires a number to be less than or equal to the supplied maximum. */
export function Max(value: number, options?: OptionsArg): PropertyDecorator { return typed('number', 'max', value, options); }
/** Requires a number to stay within the inclusive range. */
export function Between(min: number, max: number, options?: OptionsArg): PropertyDecorator { return typed('number', 'between', {min, max} satisfies Range, options); }
/** Requires a number to be greater than zero. */
export function Positive(options?: OptionsArg): PropertyDecorator { return typed('number', 'positive', undefined, options); }
/** Requires a number to be greater than or equal to zero. */
export function PositiveOrZero(options?: OptionsArg): PropertyDecorator { return typed('number', 'positiveOrZero', undefined, options); }
/** Requires a number to be less than zero. */
export function Negative(options?: OptionsArg): PropertyDecorator { return typed('number', 'negative', undefined, options); }
/** Requires a number to be less than or equal to zero. */
export function NegativeOrZero(options?: OptionsArg): PropertyDecorator { return typed('number', 'negativeOrZero', undefined, options); }
/** Requires a number to be an integer. */
export function Integer(options?: OptionsArg): PropertyDecorator { return typed('number', 'integer', undefined, options); }
/** Requires a number to be finite. */
export function Finite(options?: OptionsArg): PropertyDecorator { return typed('number', 'finite', undefined, options); }
/** Requires a number to be evenly divisible by the supplied factor. */
export function MultipleOf(value: number, options?: OptionsArg): PropertyDecorator { return typed('number', 'multipleOf', value, options); }

/** Requires a date-like value to be before the current time. */
export function Past(options?: OptionsArg): PropertyDecorator { return typed('date', 'past', undefined, options); }
/** Requires a date-like value to be before or equal to the current time. */
export function PastOrPresent(options?: OptionsArg): PropertyDecorator { return typed('date', 'pastOrPresent', undefined, options); }
/** Requires a date-like value to be after the current time. */
export function Future(options?: OptionsArg): PropertyDecorator { return typed('date', 'future', undefined, options); }
/** Requires a date-like value to be after or equal to the current time. */
export function FutureOrPresent(options?: OptionsArg): PropertyDecorator { return typed('date', 'futureOrPresent', undefined, options); }
/** Requires a date-like value to be before the supplied target. */
export function Before(value: Date | string | number, options?: OptionsArg): PropertyDecorator { return typed('date', 'before', value, options); }
/** Requires a date-like value to be after the supplied target. */
export function After(value: Date | string | number, options?: OptionsArg): PropertyDecorator { return typed('date', 'after', value, options); }
/** Requires a date-like value to stay within the inclusive date range. */
export function BetweenDates(min: Date | string | number, max: Date | string | number, options?: OptionsArg): PropertyDecorator { return typed('date', 'betweenDates', {min, max} satisfies DateRange, options); }

/** Requires an array to contain at least the supplied item count. */
export function MinItems(value: number, options?: OptionsArg): PropertyDecorator { return typed('array', 'minItems', value, options); }
/** Requires an array to contain at most the supplied item count. */
export function MaxItems(value: number, options?: OptionsArg): PropertyDecorator { return typed('array', 'maxItems', value, options); }
/** Requires an array size to stay within the inclusive range. */
export function Size(min: number, max: number, options?: OptionsArg): PropertyDecorator { return typed('array', 'size', {min, max} satisfies Range, options); }
/** Requires an array to contain unique items according to Set equality. */
export function UniqueItems(options?: OptionsArg): PropertyDecorator { return typed('array', 'uniqueItems', undefined, options); }
/** Requires an array to contain at least one item. */
export function NotEmptyArray(options?: OptionsArg): PropertyDecorator { return typed('array', 'notEmptyArray', undefined, options); }

/** Requires a value to be one of the supplied enum values and marks the field as enum-typed. */
export function Enum(values: readonly unknown[], options?: OptionsArg): PropertyDecorator { return typed('enum', 'enum', values, options); }
/** Requires a value to be one of the supplied allowed values. */
export function OneOf(values: readonly unknown[], options?: OptionsArg): PropertyDecorator { return add('oneOf', values, options); }
/** Requires a value not to be one of the supplied forbidden values. */
export function NotOneOf(values: readonly unknown[], options?: OptionsArg): PropertyDecorator { return add('notOneOf', values, options); }
/** Requires the field to equal another root object field by dot-path. */
export function EqualsField(path: string, options?: OptionsArg): PropertyDecorator { return add('equalsField', {path}, options); }
/** Requires the field not to equal another root object field by dot-path. */
export function NotEqualsField(path: string, options?: OptionsArg): PropertyDecorator { return add('notEqualsField', {path}, options); }
/** Requires the number field to be greater than another root object number field. */
export function GreaterThanField(path: string, options?: OptionsArg): PropertyDecorator { return typed('number', 'greaterThanField', {path}, options); }
/** Requires the number field to be greater than or equal to another root object number field. */
export function GreaterOrEqualField(path: string, options?: OptionsArg): PropertyDecorator { return typed('number', 'greaterOrEqualField', {path}, options); }
/** Requires the number field to be less than another root object number field. */
export function LessThanField(path: string, options?: OptionsArg): PropertyDecorator { return typed('number', 'lessThanField', {path}, options); }
/** Requires the number field to be less than or equal to another root object number field. */
export function LessOrEqualField(path: string, options?: OptionsArg): PropertyDecorator { return typed('number', 'lessOrEqualField', {path}, options); }
/** Requires the date-like field to be before another root object date-like field. */
export function BeforeField(path: string, options?: OptionsArg): PropertyDecorator { return typed('date', 'beforeField', {path}, options); }
/** Requires the date-like field to be after another root object date-like field. */
export function AfterField(path: string, options?: OptionsArg): PropertyDecorator { return typed('date', 'afterField', {path}, options); }
/** Requires the field when the predicate is true for the root object. */
export function RequiredIf<TObject = unknown>(predicate: (object: TObject) => boolean, options?: OptionsArg): PropertyDecorator { return add('requiredIf', {predicate}, options); }
/** Forbids the field when the predicate is true for the root object. */
export function ForbiddenIf<TObject = unknown>(predicate: (object: TObject) => boolean, options?: OptionsArg): PropertyDecorator { return add('forbiddenIf', {predicate}, options); }