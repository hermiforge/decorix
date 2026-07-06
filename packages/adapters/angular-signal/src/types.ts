import type {FieldMetadata, ModelMetadata, ModelTarget, ValidationIssue, ValidatorAdapterRef} from '@decorix/core';

/**
 * Initial values passed to generated Decorix signal forms.
 */
export type DecorixInitialValue = Record<string, unknown>;

/**
 * Options for the Angular Signal Forms adapter.
 */
export type DecorixAngularSignalFormOptions = {
    initialValue?: DecorixInitialValue;
    validator?: ValidatorAdapterRef;
};

/**
 * Signal-like field facade produced by the Angular Signal Forms adapter.
 */
export type DecorixSignalField<TValue = unknown> = {
    metadata: FieldMetadata;
    value(): TValue;
    set(value: TValue): void;
    errors(): string[];
    valid(): boolean;
    /** Async field errors resolving async constraints; use when the model declares async rules. */
    errorsAsync(): Promise<string[]>;
    /** Async field validity resolving async constraints. */
    validAsync(): Promise<boolean>;
};

/**
 * Failed signal form submission result.
 */
export type DecorixSignalFormSubmitFailure = {
    success: false;
    errors: Record<string, string[]>;
    issues: ValidationIssue[];
};

/**
 * Signal-like form facade produced from Decorix metadata.
 */
export type DecorixSignalForm = Record<string, DecorixSignalField> & {
    metadata: ModelMetadata;
    valid(): boolean;
    errors(): Record<string, string[]>;
    value(): DecorixInitialValue;
    submit(): { success: true; data: unknown } | DecorixSignalFormSubmitFailure;
    /** Async form validity resolving async constraints. */
    validAsync(): Promise<boolean>;
    /** Async form errors keyed by field, resolving async constraints. */
    errorsAsync(): Promise<Record<string, string[]>>;
    /** Async submit resolving async constraints before returning parsed data or failures. */
    submitAsync(): Promise<{ success: true; data: unknown } | DecorixSignalFormSubmitFailure>;
};

/**
 * Registered model class or raw Decorix metadata accepted by the adapter.
 */
export type DecorixSignalFormModel = ModelTarget | ModelMetadata;
