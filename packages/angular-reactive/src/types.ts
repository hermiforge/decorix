import type {ConstraintMetadata, FieldMetadata, ModelMetadata, ModelTarget, ValidationResult, ValidatorAdapterRef} from '@decorix/core';

/**
 * Initial values passed to generated reactive form config.
 */
export type DecorixReactiveInitialValue = Record<string, unknown>;

/**
 * Options for the Angular Reactive Forms adapter.
 */
export type DecorixAngularReactiveFormOptions = {
    initialValue?: DecorixReactiveInitialValue;
    validator?: ValidatorAdapterRef;
};

/**
 * Abstract validator descriptor derived from Decorix constraints.
 */
export type DecorixReactiveFieldValidator = {
    kind: ConstraintMetadata['kind'];
    value?: unknown;
    message?: string;
};

/**
 * Reactive Forms field configuration generated from Decorix metadata.
 */
export type DecorixReactiveFieldConfig = {
    name: string;
    initialValue: unknown;
    required: boolean;
    metadata: FieldMetadata;
    validators: DecorixReactiveFieldValidator[];
};

/**
 * Reactive Forms configuration generated from Decorix metadata.
 */
export type DecorixReactiveFormConfig = {
    metadata: ModelMetadata;
    fields: DecorixReactiveFieldConfig[];
    validate?: (value: unknown) => ValidationResult;
};

/**
 * Registered model class or raw Decorix metadata accepted by the adapter.
 */
export type DecorixReactiveFormModel = ModelTarget | ModelMetadata;
