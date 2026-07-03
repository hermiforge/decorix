import {model, numberField, stringField} from '@decorix/core';

/**
 * Builder-based DTO fixture. Exported so the CLI loader can discover the raw
 * `ModelMetadata` object produced by the builder API.
 */
export const CliProductDto = model('CliProductDto', {
    title: stringField().required('Title is required').minLength(2).label('Title'),
    price: numberField().min(0, 'Price cannot be negative')
});
