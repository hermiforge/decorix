import type {ModelMetadata, ModelTarget, ValidatorAdapterRef} from '@hermiforge-decorix/core';

/**
 * Options used by the TanStack Form adapter.
 */
export type DecorixTanStackFormOptions = {
    defaultValues?: Record<string, unknown>;
    validator?: ValidatorAdapterRef;
};

/**
 * A single TanStack Form field-level validation error report, as expected by
 * `onSubmit`/`onSubmitAsync`: `{fields: {name: message}}`, or `undefined` when valid.
 */
export type DecorixTanStackFormErrors = {fields: Record<string, string>};

/**
 * TanStack Form-oriented configuration generated from Decorix metadata.
 */
export type DecorixTanStackFormConfig = {
    metadata: ModelMetadata;
    defaultValues: Record<string, unknown>;
    validators: {
        /** @param ctx - TanStack Form's submit context; only `value` (the current form values) is read. */
        onSubmit(ctx: {value: unknown}): DecorixTanStackFormErrors | undefined;
        /** Async submit validator resolving async constraints; falls back to the sync result otherwise. */
        onSubmitAsync(ctx: {value: unknown}): Promise<DecorixTanStackFormErrors | undefined>;
    };
};

/**
 * Registered model class or raw Decorix metadata accepted by the adapter.
 */
export type DecorixTanStackFormModel = ModelTarget | ModelMetadata;
