import {cloneModelMetadata, isModelMetadata} from '../metadata/clone';
import type {FieldMetadata, ModelMetadata, ModelTarget} from '../metadata/types';

const modelRegistry = new WeakMap<ModelTarget, ModelMetadata>();

/**
 * Registers metadata for a model target.
 *
 * @param target - Constructor or function used as the registry key.
 * @param metadata - Complete model metadata to store.
 * @returns The stored metadata object.
 */
export function registerModelMetadata(target: ModelTarget, metadata: ModelMetadata): ModelMetadata {
    modelRegistry.set(target, cloneModelMetadata(metadata));
    return getModelMetadata(target);
}

/**
 * Returns true when a model target has Decorix metadata.
 *
 * @param target - Constructor or function to inspect.
 * @returns Whether metadata exists in the Decorix registry.
 */
export function hasModelMetadata(target: ModelTarget): boolean {
    return modelRegistry.has(target);
}

/**
 * Reads metadata from a registered target or returns raw metadata unchanged.
 *
 * @param modelOrMetadata - Registered class/function or a metadata object.
 * @returns A defensive clone of the model metadata.
 * @throws Error when no metadata is registered for the supplied target.
 */
export function getModelMetadata(modelOrMetadata: ModelTarget | ModelMetadata): ModelMetadata {
    if (isModelMetadata(modelOrMetadata)) {
        return cloneModelMetadata(modelOrMetadata);
    }

    const metadata = modelRegistry.get(modelOrMetadata);
    if (!metadata) {
        throw new Error(`No Decorix metadata registered for ${modelOrMetadata.name || 'anonymous model'}.`);
    }

    return cloneModelMetadata(metadata);
}

export function getOrCreateMutableModelMetadata(target: ModelTarget): ModelMetadata {
    const current = modelRegistry.get(target);
    if (current) {
        return current;
    }

    const metadata: ModelMetadata = {name: target.name, fields: []};
    modelRegistry.set(target, metadata);
    return metadata;
}

export function commitModelMetadata(target: ModelTarget, metadata: ModelMetadata): void {
    modelRegistry.set(target, cloneModelMetadata(metadata));
}

export function getOrCreateMutableFieldMetadata(target: ModelTarget, name: string): FieldMetadata {
    const metadata = getOrCreateMutableModelMetadata(target);
    const existing = metadata.fields.find((field) => field.name === name);
    if (existing) {
        return existing;
    }

    const field: FieldMetadata = {name, type: 'string', required: false, constraints: []};
    metadata.fields.push(field);
    return field;
}
