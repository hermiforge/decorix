import type {ModelMetadata, ModelTarget} from '@hermiforge-decorix/core';
import type {Injector} from '@angular/core';

/**
 * Initial values passed to generated Decorix signal forms.
 */
export type DecorixInitialValue = Record<string, unknown>;

/**
 * Options for the Angular Signal Forms adapter.
 *
 * Unlike other Decorix adapters, this one does not use a `ValidatorAdapter`: constraints are mapped
 * directly onto Angular's native validators (or `validate()`/`validateAsync()` fallbacks) through
 * Decorix's constraint registry, the same way `@hermiforge-decorix/angular-reactive` does.
 */
export type DecorixAngularSignalFormOptions = {
    initialValue?: DecorixInitialValue;
    /**
     * Injector used to construct the `resource()` backing async constraints.
     * Required when `toSignalForm` is called outside an Angular injection context
     * (e.g. outside a component field initializer); see Angular's `resource()` docs.
     */
    injector?: Injector;
};

/**
 * Registered model class or raw Decorix metadata accepted by the adapter.
 */
export type DecorixSignalFormModel<T = Record<string, unknown>> = ModelTarget<T> | ModelMetadata;
