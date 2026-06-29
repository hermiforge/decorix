import {getModelMetadata, resolveValidatorAdapter} from '@decorix/core';
import type {ConstraintMetadata, FieldMetadata} from '@decorix/core';
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
 * Creates a Reactive Forms-oriented configuration from Decorix metadata.
 *
 * @param modelOrMetadata - Registered Decorix model target or raw metadata.
 * @param options - Optional initial values, validator adapter, and validation mode.
 * @returns Field configuration with Angular ValidatorFn instances by default.
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

function toFieldConfig(
    field: FieldMetadata,
    initialValue: unknown,
    validationMode: DecorixAngularReactiveValidationMode
): DecorixReactiveFieldConfig<DecorixAngularReactiveValidationMode> {
    const validatorDescriptors = field.constraints.map(toValidatorDescriptor);
    const base = {
        name: field.name,
        initialValue,
        required: field.required,
        metadata: field
    };

    if (validationMode === 'descriptors') {
        return {
            ...base,
            validators: validatorDescriptors
        };
    }

    const validators = angularConstraints(field).map(toAngularValidator);

    if (validationMode === 'both') {
        return {
            ...base,
            validators,
            validatorDescriptors
        };
    }

    return {
        ...base,
        validators
    };
}

function angularConstraints(field: FieldMetadata): ConstraintMetadata[] {
    const hasRequiredConstraint = field.constraints.some((constraint) => constraint.kind === 'required');
    return field.required && !hasRequiredConstraint
        ? [...field.constraints, {kind: 'required'}]
        : field.constraints;
}

function toValidatorDescriptor(constraint: ConstraintMetadata): DecorixReactiveFieldValidatorDescriptor {
    return 'value' in constraint
        ? {kind: constraint.kind, value: constraint.value, message: constraint.message}
        : {kind: constraint.kind, message: constraint.message};
}

function toAngularValidator(constraint: ConstraintMetadata): ValidatorFn {
    switch (constraint.kind) {
        case 'required':
            return requiredValidator(constraint.message);
        case 'minLength':
            return minLengthValidator(constraint.value, constraint.message);
        case 'maxLength':
            return maxLengthValidator(constraint.value, constraint.message);
        case 'email':
            return emailValidator(constraint.message);
        case 'pattern':
            return patternValidator(constraint.value, constraint.message);
        case 'min':
            return minValidator(constraint.value, constraint.message);
        case 'max':
            return maxValidator(constraint.value, constraint.message);
        default:
            return assertNever(constraint);
    }
}

function requiredValidator(message?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null =>
        isEmptyInputValue(control.value) ? validationError('required', true, message) : null;
}

function minLengthValidator(requiredLength: number, message?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const actualLength = lengthOrSize(control.value);
        if (actualLength === null || actualLength === 0 || actualLength >= requiredLength) {
            return null;
        }

        return validationError('minlength', {requiredLength, actualLength}, message);
    };
}

function maxLengthValidator(requiredLength: number, message?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const actualLength = lengthOrSize(control.value);
        if (actualLength === null || actualLength <= requiredLength) {
            return null;
        }

        return validationError('maxlength', {requiredLength, actualLength}, message);
    };
}

function emailValidator(message?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (isEmptyInputValue(control.value)) {
            return null;
        }

        return EMAIL_REGEXP.test(String(control.value)) ? null : validationError('email', true, message);
    };
}

function patternValidator(pattern: RegExp, message?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (isEmptyInputValue(control.value)) {
            return null;
        }

        const value = String(control.value);
        pattern.lastIndex = 0;
        const valid = pattern.test(value);
        pattern.lastIndex = 0;

        return valid
            ? null
            : validationError('pattern', {requiredPattern: pattern.toString(), actualValue: control.value}, message);
    };
}

function minValidator(min: number, message?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (isEmptyInputValue(control.value)) {
            return null;
        }

        const value = Number.parseFloat(String(control.value));
        return Number.isNaN(value) || value >= min
            ? null
            : validationError('min', {min, actual: control.value}, message);
    };
}

function maxValidator(max: number, message?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (isEmptyInputValue(control.value)) {
            return null;
        }

        const value = Number.parseFloat(String(control.value));
        return Number.isNaN(value) || value <= max
            ? null
            : validationError('max', {max, actual: control.value}, message);
    };
}

function validationError(key: string, value: true | Record<string, unknown>, message?: string): ValidationErrors {
    if (!message) {
        return {[key]: value};
    }

    return {
        [key]: value === true ? {message} : {...value, message}
    };
}

function isEmptyInputValue(value: unknown): boolean {
    return value == null || lengthOrSize(value) === 0;
}

function lengthOrSize(value: unknown): number | null {
    if (value == null) {
        return null;
    }

    if (typeof value === 'string' || Array.isArray(value)) {
        return value.length;
    }

    if (value instanceof Map || value instanceof Set) {
        return value.size;
    }

    const length = (value as {length?: unknown}).length;
    if (typeof length === 'number') {
        return length;
    }

    const size = (value as {size?: unknown}).size;
    return typeof size === 'number' ? size : null;
}

function assertNever(value: never): never {
    throw new Error(`Unsupported Decorix constraint: ${String(value)}`);
}
