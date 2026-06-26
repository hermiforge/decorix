import {getOrCreateMutableFieldMetadata} from '../registry/model-registry';
import type {FieldMetadata, ModelTarget} from '../metadata/types';

export function fieldDecorator(mutator: (field: FieldMetadata) => void): PropertyDecorator {
    return (target, propertyKey) => {
        const modelTarget = target.constructor as ModelTarget;
        const field = getOrCreateMutableFieldMetadata(modelTarget, String(propertyKey));
        mutator(field);
    };
}
