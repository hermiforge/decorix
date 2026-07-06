import {cloneModelMetadata, isModelMetadata} from '../metadata/clone';
import type {FieldMetadata, ModelMetadata, ModelTarget} from '../metadata/types';

const modelRegistry = new WeakMap<ModelTarget, ModelMetadata>();

/**
 * Global-symbol key mirroring model metadata directly on the target class.
 *
 * The `WeakMap` above is private to a single loaded `@hermiforge-decorix/core` instance.
 * When a model is declared under one instance (for example a DTO transpiled by
 * a tsx/tsconfig loader) but inspected under another (a natively-loaded copy of
 * core, as in `@hermiforge-decorix/cli`), the two WeakMaps differ and metadata appears
 * missing. A `Symbol.for` key is shared across every core instance and lives on
 * the class object itself, so metadata written by one instance is readable by
 * any other — matching the boundary-safe behavior builder metadata already has
 * via structural `isModelMetadata` checks.
 */
const MODEL_METADATA_KEY = Symbol.for('decorix.model.metadata');

/**
 * Mirrors metadata onto the target under {@link MODEL_METADATA_KEY} as a
 * non-enumerable property so it never leaks into spreads or `Object.keys`.
 */
function mirrorModelMetadata(target: ModelTarget, metadata: ModelMetadata): void {
    Object.defineProperty(target, MODEL_METADATA_KEY, {
        value: metadata,
        enumerable: false,
        configurable: true,
        writable: true
    });
}

/**
 * Reads the cross-instance metadata mirror from a target, if present.
 */
function readModelMetadataMirror(target: ModelTarget): ModelMetadata | undefined {
    const mirror = (target as unknown as Record<symbol, unknown>)[MODEL_METADATA_KEY];
    return isModelMetadata(mirror) ? mirror : undefined;
}

/**
 * Registers metadata for a model target.
 *
 * @param target - Constructor or function used as the registry key.
 * @param metadata - Complete model metadata to store.
 * @returns The stored metadata object.
 */
export function registerModelMetadata(target: ModelTarget, metadata: ModelMetadata): ModelMetadata {
    const stored = cloneModelMetadata(metadata);
    modelRegistry.set(target, stored);
    mirrorModelMetadata(target, stored);
    return getModelMetadata(target);
}

/**
 * Returns true when a model target has Decorix metadata.
 *
 * @param target - Constructor or function to inspect.
 * @returns Whether metadata exists in the Decorix registry.
 */
export function hasModelMetadata(target: ModelTarget): boolean {
    return modelRegistry.has(target) || readModelMetadataMirror(target) !== undefined;
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

    // Prefer the local WeakMap; fall back to the cross-instance mirror for models declared under a different core instance.
    const metadata = modelRegistry.get(modelOrMetadata) ?? readModelMetadataMirror(modelOrMetadata);
    if (!metadata) {
        throw new Error(`No Decorix metadata registered for ${modelOrMetadata.name || 'anonymous model'}.`);
    }

    return cloneModelMetadata(metadata);
}

/**
 * Reads mutable metadata for decorators, creating an empty model entry when needed.
 */
export function getOrCreateMutableModelMetadata(target: ModelTarget): ModelMetadata {
    const current = modelRegistry.get(target);
    if (current) {
        return current;
    }

    const metadata: ModelMetadata = {name: target.name, fields: []};
    modelRegistry.set(target, metadata);
    // Mirror the live object so in-place decorator mutations remain readable across core instances.
    mirrorModelMetadata(target, metadata);
    return metadata;
}

/**
 * Commits decorator-mutated metadata back to the registry as a defensive clone.
 */
export function commitModelMetadata(target: ModelTarget, metadata: ModelMetadata): void {
    const stored = cloneModelMetadata(metadata);
    modelRegistry.set(target, stored);
    mirrorModelMetadata(target, stored);
}

/**
 * Reads mutable field metadata for decorators, creating a string field placeholder when needed.
 */
export function getOrCreateMutableFieldMetadata(target: ModelTarget, name: string): FieldMetadata {
    const metadata = getOrCreateMutableModelMetadata(target);
    const existing = metadata.fields.find((field) => field.name === name);
    if (existing) {
        return existing;
    }

    // Decorators do not know the TypeScript property type, so string is the safest editable placeholder.
    const field: FieldMetadata = {name, type: 'string', required: false, constraints: []};
    metadata.fields.push(field);
    return field;
}