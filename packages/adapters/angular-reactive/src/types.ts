import type {ConstraintMetadata, FieldMetadata, ModelMetadata, ModelTarget, ValidationResult, ValidatorAdapterRef} from '@hermiforge-decorix/core';
import type {AsyncValidatorFn, ValidatorFn} from '@angular/forms';

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
    TValidationMode extends DecorixAngularReactiveValidationMode = 'angular',
    TModel = Record<string, unknown>
> = {
    initialValue?: Partial<TModel>;
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
            asyncValidators?: AsyncValidatorFn[];
            validatorDescriptors: DecorixReactiveFieldValidatorDescriptor[];
        }
      : DecorixReactiveFieldConfigBase & {
            validators: ValidatorFn[];
            asyncValidators?: AsyncValidatorFn[];
            validatorDescriptors?: never;
        };

/**
 * Reactive Forms configuration generated from Decorix metadata.
 *
 * `TModel` is inferred from a decorated class passed to {@link DecorixReactiveFormModel}
 * (e.g. `toReactiveFormConfig(SignupDto)` infers `TModel = SignupDto`), so
 * `validate`/`validateAsync` are already typed — no separate form-values type
 * or cast needed.
 */
export type DecorixReactiveFormConfig<
    TValidationMode extends DecorixAngularReactiveValidationMode = 'angular',
    TModel = Record<string, unknown>
> = {
    metadata: ModelMetadata;
    fields: DecorixReactiveFieldConfig<TValidationMode>[];
    validate?: (value: unknown) => ValidationResult<TModel>;
    /** Form-level async validation resolving async and cross-field constraints via core validation. */
    validateAsync?: (value: unknown) => Promise<ValidationResult<TModel>>;
};

/**
 * Registered model class or raw Decorix metadata accepted by the adapter.
 */
export type DecorixReactiveFormModel<TModel = Record<string, unknown>> = ModelTarget<TModel> | ModelMetadata;
