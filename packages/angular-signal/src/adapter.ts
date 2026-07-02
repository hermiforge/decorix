import {createCoreValidatorAdapter, getModelMetadata, requireValidatorAdapter} from '@decorix/core';
import {collectErrors, fieldErrors, issues} from './errors';
import type {DecorixAngularSignalFormOptions, DecorixInitialValue, DecorixSignalField, DecorixSignalForm, DecorixSignalFormModel} from './types';

/**
 * Creates an Angular Signal Forms compatible facade from Decorix metadata.
 *
 * @param modelOrMetadata - Registered Decorix model target or raw metadata.
 * @param options - Optional initial values and validator adapter.
 * @returns A signal-like form object with field accessors and validation state.
 */
export function toSignalForm(
    modelOrMetadata: DecorixSignalFormModel,
    options: DecorixAngularSignalFormOptions = {}
): DecorixSignalForm {
    const metadata = getModelMetadata(modelOrMetadata);
    const schema = (options.validator === undefined ? createCoreValidatorAdapter() : requireValidatorAdapter(options.validator)).createSchema(metadata);
    const values: DecorixInitialValue = {...options.initialValue};
    const formFields: Record<string, DecorixSignalField> = {};

    for (const field of metadata.fields) {
        if (!(field.name in values)) {
            values[field.name] = undefined;
        }

        formFields[field.name] = {
            metadata: field,
            value: () => values[field.name],
            set: (value) => {
                values[field.name] = value;
            },
            errors: () => fieldErrors(schema.validate(values), field.name),
            valid: () => fieldErrors(schema.validate(values), field.name).length === 0
        };
    }

    return {
        ...formFields,
        metadata,
        valid: () => schema.validate(values).success,
        errors: () => collectErrors(schema.validate(values)),
        value: () => ({...values}),
        submit: () => {
            const result = schema.validate(values);
            return result.success
                ? {success: true, data: result.data}
                : {success: false, errors: collectErrors(result), issues: issues(result)};
        }
    } as DecorixSignalForm;
}


