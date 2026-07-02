import type {ConstraintMetadata, FieldMetadata, ModelMetadata, ModelTarget, ValidationResult, ValidatorAdapterRef} from '@decorix/core';
import type {ValidatorFn} from '@angular/forms';

/**
 * Initial values passed to generated reactive form config.
 */
export type DecorixReactiveInitialValue = Record<string, unknown>;

/**
 * Validation output mode for generated reactive form fields.
 */
export type DecorixAngularReactiveValidationMode = 'angular' | 'descriptors' | 'both';

/**
 * Options for the Angular Reactive Forms adapter.
 */
export type DecorixAngularReactiveFormOptions<
    TValidationMode extends DecorixAngularReactiveValidationMode = 'angular'
> = {
    initialValue?: DecorixReactiveInitialValue;
    validator?: ValidatorAdapterRef;
    validationMode?: TValidationMode;
};

/**
 * Abstract validator descriptor derived from Decorix constraints.
 */
export type DecorixReactiveFieldValidatorDescriptor = {
    kind: ConstraintMetadata['name'];
    groups?: string[];
    value?: unknown;
    message?: string;
};

type DecorixReactiveFieldConfigBase = {
    name: string;
    initialValue: unknown;
    required: boolean;
    metadata: FieldMetadata;
};

/**
 * Reactive Forms field configuration generated from Decorix metadata.
 */
export type DecorixReactiveFieldConfig<
    TValidationMode extends DecorixAngularReactiveValidationMode = 'angular'
> = TValidationMode extends 'descriptors'
    ? DecorixReactiveFieldConfigBase & {
          validators: DecorixReactiveFieldValidatorDescriptor[];
          validatorDescriptors?: never;
      }
    : TValidationMode extends 'both'
      ? DecorixReactiveFieldConfigBase & {
            validators: ValidatorFn[];
            validatorDescriptors: DecorixReactiveFieldValidatorDescriptor[];
        }
      : DecorixReactiveFieldConfigBase & {
            validators: ValidatorFn[];
            validatorDescriptors?: never;
        };

/**
 * Reactive Forms configuration generated from Decorix metadata.
 */
export type DecorixReactiveFormConfig<
    TValidationMode extends DecorixAngularReactiveValidationMode = 'angular'
> = {
    metadata: ModelMetadata;
    fields: DecorixReactiveFieldConfig<TValidationMode>[];
    validate?: (value: unknown) => ValidationResult;
};

/**
 * Registered model class or raw Decorix metadata accepted by the adapter.
 */
export type DecorixReactiveFormModel = ModelTarget | ModelMetadata;
