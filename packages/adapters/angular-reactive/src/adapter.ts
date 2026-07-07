import {
    buildValidationContext,
    createCoreValidatorAdapter,
    getConstraint,
    getModelMetadata,
    hasAsyncConstraints,
    normalizeConstraintIssue,
    resolveConstraintDefinition,
    resolveValidatorAdapter,
    runSchemaAsync
} from '@hermiforge-decorix/core';
import type {ConstraintMetadata, FieldMetadata, ValidationResult} from '@hermiforge-decorix/core';
import type {AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn} from '@angular/forms';
import type {
    DecorixAngularReactiveFormOptions,
    DecorixAngularReactiveValidationMode,
    DecorixReactiveFieldConfig,
    DecorixReactiveFieldValidatorDescriptor,
    DecorixReactiveFormConfig,
    DecorixReactiveFormModel
} from './types';

// The domain label before the final dot excludes `.` to keep the match linear-time.
const EMAIL_REGEXP = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

/**
 * Creates an Angular Reactive Forms configuration from Decorix metadata.
 *
 * `TModel` is inferred from a decorated class passed directly as
 * `modelOrMetadata` (e.g. `toReactiveFormConfig(SignupDto)` infers
 * `TModel = SignupDto`), independently of `TValidationMode`.
 */
export function toReactiveFormConfig<TModel = Record<string, unknown>>(
    modelOrMetadata: DecorixReactiveFormModel<TModel>,
    options?: DecorixAngularReactiveFormOptions<'angular', TModel>
): DecorixReactiveFormConfig<'angular', TModel>;
export function toReactiveFormConfig<TModel = Record<string, unknown>>(
    modelOrMetadata: DecorixReactiveFormModel<TModel>,
    options: DecorixAngularReactiveFormOptions<'descriptors', TModel>
): DecorixReactiveFormConfig<'descriptors', TModel>;
export function toReactiveFormConfig<TModel = Record<string, unknown>>(
    modelOrMetadata: DecorixReactiveFormModel<TModel>,
    options: DecorixAngularReactiveFormOptions<'both', TModel>
): DecorixReactiveFormConfig<'both', TModel>;
export function toReactiveFormConfig<TModel = Record<string, unknown>>(
    modelOrMetadata: DecorixReactiveFormModel<TModel>,
    options: DecorixAngularReactiveFormOptions<DecorixAngularReactiveValidationMode, TModel> = {}
): DecorixReactiveFormConfig<DecorixAngularReactiveValidationMode, TModel> {
    const metadata = getModelMetadata(modelOrMetadata);
    // A core-backed schema powers form-level validation when cross-field or async constraints are present.
    const needsCoreSchema = hasV2Constraints(metadata) || hasAsyncConstraints(metadata);
    const adapter = options.validator === undefined && needsCoreSchema ? createCoreValidatorAdapter() : resolveValidatorAdapter(options.validator);
    const schema = adapter?.createSchema(metadata);
    const validationMode = options.validationMode ?? 'angular';
    const initialValue = options.initialValue as Record<string, unknown> | undefined;

    return {
        metadata,
        fields: metadata.fields.map((field) => toFieldConfig(field, initialValue?.[field.name], validationMode)),
        ...(schema
            ? {
                  validate: (value: unknown) => schema.validate(value) as ValidationResult<TModel>,
                  validateAsync: (value: unknown) => runSchemaAsync(schema, value) as Promise<ValidationResult<TModel>>
              }
            : {})
    };
}

/** Builds one Reactive Forms field config for the selected validation output mode. */
function toFieldConfig(
    field: FieldMetadata,
    initialValue: unknown,
    validationMode: DecorixAngularReactiveValidationMode
): DecorixReactiveFieldConfig<DecorixAngularReactiveValidationMode> {
    const constraints = angularConstraints(field);
    const validatorDescriptors = constraints.map(toValidatorDescriptor);
    const base = {name: field.name, initialValue, required: field.required, metadata: field};

    if (validationMode === 'descriptors') return {...base, validators: validatorDescriptors};

    // Async constraints cannot run inside Angular's synchronous ValidatorFn, so they become AsyncValidatorFns.
    const validators = constraints.filter((constraint) => !isAsyncConstraint(constraint)).map((constraint) => toAngularValidator(constraint, field));
    const asyncValidators = constraints.filter(isAsyncConstraint).map((constraint) => toAngularAsyncValidator(constraint, field));
    const asyncPart = asyncValidators.length ? {asyncValidators} : {};
    if (validationMode === 'both') return {...base, validators, ...asyncPart, validatorDescriptors};
    return {...base, validators, ...asyncPart};
}

/** Returns whether a registered constraint requires asynchronous validation. */
function isAsyncConstraint(constraint: ConstraintMetadata): boolean {
    return getConstraint(constraint.name)?.async === true;
}

/** Adds implicit required metadata so Angular ValidatorFn output matches Decorix core semantics. */
function angularConstraints(field: FieldMetadata): ConstraintMetadata[] {
    const fieldConstraints = field.constraints.filter((constraint) => !isV2Constraint(constraint.name));
    const hasRequiredConstraint = fieldConstraints.some((constraint) => constraint.name === 'required');
    return field.required && !hasRequiredConstraint
        ? [{name: 'required'}, ...fieldConstraints]
        : fieldConstraints;
}

/** Converts Decorix constraint metadata to a framework-neutral validator descriptor. */
function toValidatorDescriptor(constraint: ConstraintMetadata): DecorixReactiveFieldValidatorDescriptor {
    return {kind: constraint.name, value: constraint.options, message: constraint.message, groups: constraint.groups};
}

/** Maps a constraint to a native Angular validator or Decorix fallback ValidatorFn. */
function toAngularValidator(constraint: ConstraintMetadata, field: FieldMetadata): ValidatorFn {
    switch (constraint.name) {
        case 'required': return requiredValidator(constraint.message);
        case 'minLength': return minLengthValidator(Number(constraint.options), constraint.message);
        case 'maxLength': return maxLengthValidator(Number(constraint.options), constraint.message);
        case 'email': return emailValidator(constraint.message);
        case 'pattern': return patternValidator(constraint.options as RegExp, constraint.message);
        case 'min': return minValidator(Number(constraint.options), constraint.message);
        case 'max': return maxValidator(Number(constraint.options), constraint.message);
        default:
            // Angular does not have native validators for every Decorix rule, so registered sync constraints run through a custom ValidatorFn.
            return decorixConstraintValidator(constraint, field);
    }
}

/** Enforces non-native sync constraints inside Angular's synchronous ValidatorFn contract. */
function decorixConstraintValidator(constraint: ConstraintMetadata, field: FieldMetadata): ValidatorFn {
    const definition = resolveConstraintDefinition(constraint);
    if (definition.async) {
        throw new Error(`Decorix constraint "${constraint.name}" is async and cannot be emitted as an Angular ValidatorFn.`);
    }

    return (control: AbstractControl): ValidationErrors | null => {
        const context = buildValidationContext({}, control.value, field.name);
        const result = definition.validate(control.value, constraint.options, context);
        if (result instanceof Promise) {
            throw new Error(`Decorix constraint "${constraint.name}" returned a Promise and cannot be emitted as an Angular ValidatorFn.`);
        }
        const issue = normalizeConstraintIssue(result, definition, constraint, context);
        return issue ? validationError(issue.constraint, issue.params ?? true, issue.message) : null;
    };
}

/** Wraps an async Decorix constraint in Angular's AsyncValidatorFn contract. */
function toAngularAsyncValidator(constraint: ConstraintMetadata, field: FieldMetadata): AsyncValidatorFn {
    const definition = resolveConstraintDefinition(constraint);
    return (control: AbstractControl): Promise<ValidationErrors | null> => {
        const context = buildValidationContext({}, control.value, field.name);
        return Promise.resolve(definition.validate(control.value, constraint.options, context)).then((result) => {
            const issue = normalizeConstraintIssue(result, definition, constraint, context);
            return issue ? validationError(issue.constraint, issue.params ?? true, issue.message) : null;
        });
    };
}

function requiredValidator(message?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => isEmptyInputValue(control.value) ? validationError('required', true, message) : null;
}

function minLengthValidator(requiredLength: number, message?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const actualLength = lengthOrSize(control.value);
        if (actualLength === null || actualLength === 0 || actualLength >= requiredLength) return null;
        return validationError('minlength', {requiredLength, actualLength}, message);
    };
}

function maxLengthValidator(requiredLength: number, message?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const actualLength = lengthOrSize(control.value);
        if (actualLength === null || actualLength <= requiredLength) return null;
        return validationError('maxlength', {requiredLength, actualLength}, message);
    };
}

function emailValidator(message?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (isEmptyInputValue(control.value)) return null;
        return EMAIL_REGEXP.test(String(control.value)) ? null : validationError('email', true, message);
    };
}

function patternValidator(pattern: RegExp, message?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (isEmptyInputValue(control.value)) return null;
        const value = String(control.value);
        pattern.lastIndex = 0;
        const valid = pattern.test(value);
        pattern.lastIndex = 0;
        return valid ? null : validationError('pattern', {requiredPattern: pattern.toString(), actualValue: control.value}, message);
    };
}

function minValidator(min: number, message?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (isEmptyInputValue(control.value)) return null;
        const value = Number.parseFloat(String(control.value));
        return Number.isNaN(value) || value >= min ? null : validationError('min', {min, actual: control.value}, message);
    };
}

function maxValidator(max: number, message?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (isEmptyInputValue(control.value)) return null;
        const value = Number.parseFloat(String(control.value));
        return Number.isNaN(value) || value <= max ? null : validationError('max', {max, actual: control.value}, message);
    };
}

/** Shapes a ValidationErrors entry while preserving custom messages. */
function validationError(key: string, value: true | Record<string, unknown>, message?: string): ValidationErrors {
    if (!message) return {[key]: value};
    return {[key]: value === true ? {message} : {...value, message}};
}

function isEmptyInputValue(value: unknown): boolean { return value == null || lengthOrSize(value) === 0; }

function lengthOrSize(value: unknown): number | null {
    if (value == null) return null;
    if (typeof value === 'string' || Array.isArray(value)) return value.length;
    if (value instanceof Map || value instanceof Set) return value.size;
    const length = (value as {length?: unknown}).length;
    if (typeof length === 'number') return length;
    const size = (value as {size?: unknown}).size;
    return typeof size === 'number' ? size : null;
}

const V2_CONSTRAINTS = new Set([
    'equalsField',
    'notEqualsField',
    'greaterThanField',
    'greaterOrEqualField',
    'lessThanField',
    'lessOrEqualField',
    'beforeField',
    'afterField',
    'requiredIf',
    'forbiddenIf'
]);

function hasV2Constraints(metadata: {fields: FieldMetadata[]; objectConstraints?: ConstraintMetadata[]}): boolean {
    return (metadata.objectConstraints?.length ?? 0) > 0 || metadata.fields.some(fieldHasV2Constraint);
}

function fieldHasV2Constraint(field: FieldMetadata): boolean {
    return field.constraints.some((constraint) => isV2Constraint(constraint.name))
        || (field.fields?.some(fieldHasV2Constraint) ?? false)
        || (field.item ? fieldHasV2Constraint(field.item) : false);
}

function isV2Constraint(name: string): boolean {
    return V2_CONSTRAINTS.has(name);
}