import {getConstraint, getModelMetadata, resolveValidatorAdapter} from '@decorix/core';
import type {ConstraintDefinition, ConstraintMetadata, FieldMetadata, ValidationContext, ValidationIssue, ValidationIssueInput} from '@decorix/core';
import type {AbstractControl, ValidationErrors, ValidatorFn} from '@angular/forms';
import type {
    DecorixAngularReactiveFormOptions,
    DecorixAngularReactiveValidationMode,
    DecorixReactiveFieldConfig,
    DecorixReactiveFieldValidatorDescriptor,
    DecorixReactiveFormConfig,
    DecorixReactiveFormModel
} from './types';

const EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Creates an Angular Reactive Forms configuration from Decorix metadata.
 */
export function toReactiveFormConfig(
    modelOrMetadata: DecorixReactiveFormModel,
    options?: DecorixAngularReactiveFormOptions<'angular'>
): DecorixReactiveFormConfig<'angular'>;
export function toReactiveFormConfig(
    modelOrMetadata: DecorixReactiveFormModel,
    options: DecorixAngularReactiveFormOptions<'descriptors'>
): DecorixReactiveFormConfig<'descriptors'>;
export function toReactiveFormConfig(
    modelOrMetadata: DecorixReactiveFormModel,
    options: DecorixAngularReactiveFormOptions<'both'>
): DecorixReactiveFormConfig<'both'>;
export function toReactiveFormConfig(
    modelOrMetadata: DecorixReactiveFormModel,
    options: DecorixAngularReactiveFormOptions<DecorixAngularReactiveValidationMode> = {}
): DecorixReactiveFormConfig<DecorixAngularReactiveValidationMode> {
    const metadata = getModelMetadata(modelOrMetadata);
    const adapter = resolveValidatorAdapter(options.validator);
    const schema = adapter?.createSchema(metadata);
    const validationMode = options.validationMode ?? 'angular';

    return {
        metadata,
        fields: metadata.fields.map((field) => toFieldConfig(field, options.initialValue?.[field.name], validationMode)),
        ...(schema ? {validate: (value: unknown) => schema.validate(value)} : {})
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

    const validators = constraints.map((constraint) => toAngularValidator(constraint, field));
    if (validationMode === 'both') return {...base, validators, validatorDescriptors};
    return {...base, validators};
}

/** Adds implicit required metadata so Angular ValidatorFn output matches Decorix core semantics. */
function angularConstraints(field: FieldMetadata): ConstraintMetadata[] {
    const hasRequiredConstraint = field.constraints.some((constraint) => constraint.name === 'required');
    return field.required && !hasRequiredConstraint
        ? [{name: 'required'}, ...field.constraints]
        : field.constraints;
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
    const definition = getRequiredDefinition(constraint);
    if (definition.async) {
        throw new Error(`Decorix constraint "${constraint.name}" is async and cannot be emitted as an Angular ValidatorFn.`);
    }

    return (control: AbstractControl): ValidationErrors | null => {
        const context = contextFor(control.value, field.name);
        const result = definition.validate(control.value, constraint.options, context);
        if (result instanceof Promise) {
            throw new Error(`Decorix constraint "${constraint.name}" returned a Promise and cannot be emitted as an Angular ValidatorFn.`);
        }
        const issue = normalizeIssue(result, definition, constraint, context);
        return issue ? validationError(issue.constraint, issue.params ?? true, issue.message) : null;
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

/** Resolves a constraint definition or fails loudly instead of dropping validation. */
function getRequiredDefinition(constraint: ConstraintMetadata): ConstraintDefinition {
    const definition = getConstraint(constraint.name);
    if (!definition) throw new Error(`No Decorix constraint registered for "${constraint.name}".`);
    return definition;
}

/** Normalizes custom constraint output for Angular validation errors. */
function normalizeIssue(result: boolean | ValidationIssueInput, definition: ConstraintDefinition, constraint: ConstraintMetadata, context: ValidationContext): ValidationIssue | undefined {
    if (result === true) return undefined;
    const input = result === false ? {} : result;
    return {
        path: input.path ?? [context.property ?? ''],
        code: input.code ?? `decorix.${constraint.name}`,
        message: constraint.message ?? input.message ?? messageFor(definition, constraint.options, context),
        constraint: constraint.name,
        params: input.params ?? paramsFor(constraint.options)
    };
}

function messageFor(definition: ConstraintDefinition, options: unknown, context: ValidationContext): string {
    if (typeof definition.message === 'function') return definition.message(options, context);
    return definition.message ?? `Value failed ${definition.name} validation.`;
}

function paramsFor(options: unknown): Record<string, unknown> | undefined {
    if (options === undefined) return undefined;
    if (typeof options === 'object' && options !== null && !Array.isArray(options) && !(options instanceof RegExp) && !(options instanceof Date)) {
        return {...options as Record<string, unknown>};
    }
    return {value: options};
}

function contextFor(value: unknown, property: string): ValidationContext {
    return {object: {}, property, value};
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
