import {getModelMetadata, resolveValidatorAdapter} from '@decorix/core';
import type {
    DecorixAngularReactiveFormOptions,
    DecorixReactiveFieldValidator,
    DecorixReactiveFormConfig,
    DecorixReactiveFormModel
} from './types';

/**
 * Creates a Reactive Forms-oriented configuration from Decorix metadata.
 *
 * @param modelOrMetadata - Registered Decorix model target or raw metadata.
 * @param options - Optional initial values and validator adapter.
 * @returns Framework-neutral field configuration usable by an Angular adapter layer.
 */
export function toReactiveFormConfig(
    modelOrMetadata: DecorixReactiveFormModel,
    options: DecorixAngularReactiveFormOptions = {}
): DecorixReactiveFormConfig {
    const metadata = getModelMetadata(modelOrMetadata);
    const adapter = resolveValidatorAdapter(options.validator);
    const schema = adapter?.createSchema(metadata);

    return {
        metadata,
        fields: metadata.fields.map((field) => ({
            name: field.name,
            initialValue: options.initialValue?.[field.name],
            required: field.required,
            metadata: field,
            validators: field.constraints.map(toValidatorDescriptor)
        })),
        ...(schema ? {validate: (value: unknown) => schema.validate(value)} : {})
    };
}

function toValidatorDescriptor(constraint: DecorixReactiveFieldValidator): DecorixReactiveFieldValidator {
    return 'value' in constraint
        ? {kind: constraint.kind, value: constraint.value, message: constraint.message}
        : {kind: constraint.kind, message: constraint.message};
}
