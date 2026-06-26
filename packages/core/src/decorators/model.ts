import {commitModelMetadata, getOrCreateMutableModelMetadata} from '../registry/model-registry';
import type {ModelTarget} from '../metadata/types';

/**
 * Declares a class as a Decorix model.
 *
 * @param name - Optional public model name. Defaults to the class name.
 * @returns A class decorator that finalizes metadata for the target.
 */
export function Model(name?: string): ClassDecorator {
    return (target) => {
        const modelTarget = target as ModelTarget;
        const metadata = getOrCreateMutableModelMetadata(modelTarget);
        metadata.name = name ?? modelTarget.name;
        commitModelMetadata(modelTarget, metadata);
    };
}
