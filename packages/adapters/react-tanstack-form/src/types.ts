import type {ModelMetadata, ModelTarget, ValidatorAdapterRef} from '@hermiforge-decorix/core';

/**
 * Options used by the TanStack Form adapter.
 */
export type DecorixTanStackFormOptions<T = Record<string, unknown>> = {
    defaultValues?: Partial<T>;
    validator?: ValidatorAdapterRef;
};

/**
 * A single TanStack Form field-level validation error report, as expected by
 * `onSubmit`/`onSubmitAsync`: `{fields: {name: message}}`, or `undefined` when valid.
 */
export type DecorixTanStackFormErrors = {fields: Record<string, string>};

/**
 * TanStack Form-oriented configuration generated from Decorix metadata.
 *
 * `T` is inferred from a decorated class passed to {@link DecorixTanStackFormModel}
 * (e.g. `toTanStackForm(SignupDto)` infers `T = SignupDto`), so `defaultValues`
 * is already typed for TanStack Form's `useForm<T>` — no separate form-values
 * type or cast needed.
 */
export type DecorixTanStackFormConfig<T = Record<string, unknown>> = {
    metadata: ModelMetadata;
    defaultValues: Partial<T>;
    validators: {
        /** @param ctx - TanStack Form's submit context; only `value` (the current form values) is read. */
        onSubmit(ctx: {value: T}): DecorixTanStackFormErrors | undefined;
        /** Async submit validator resolving async constraints; falls back to the sync result otherwise. */
        onSubmitAsync(ctx: {value: T}): Promise<DecorixTanStackFormErrors | undefined>;
    };
};

/**
 * Registered model class or raw Decorix metadata accepted by the adapter.
 */
export type DecorixTanStackFormModel<T = Record<string, unknown>> = ModelTarget<T> | ModelMetadata;
