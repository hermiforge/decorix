import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {tsImport} from 'tsx/esm/api';
import {getModelMetadata, hasModelMetadata, isModelMetadata} from '@decorix/core';
import type {ModelMetadata, ModelTarget} from '@decorix/core';

/** A Decorix model discovered on a loaded module, with its export name and metadata. */
export type DiscoveredModel = {
    /** Public model name from its metadata. */
    name: string;
    /** Name of the module export the model was found under. */
    exportName: string;
    /** Resolved model metadata. */
    metadata: ModelMetadata;
};

/**
 * Collects Decorix models from a loaded module's exports.
 *
 * Recognizes both decorator-declared classes (registered via `@Model`) and
 * exported raw `ModelMetadata` objects produced by the builder API.
 *
 * @param moduleExports - The object returned by importing a DTO entry module.
 * @returns Every discovered model with its export name and metadata.
 */
export function discoverModels(moduleExports: Record<string, unknown>): DiscoveredModel[] {
    const models: DiscoveredModel[] = [];
    for (const [exportName, value] of Object.entries(moduleExports)) {
        if (typeof value === 'function' && hasModelMetadata(value as ModelTarget)) {
            const metadata = getModelMetadata(value as ModelTarget);
            models.push({name: metadata.name, exportName, metadata});
        } else if (isModelMetadata(value)) {
            models.push({name: value.name, exportName, metadata: value});
        }
    }
    return models;
}

/**
 * Loads a TypeScript or JavaScript entry module and returns its exports.
 *
 * Uses tsx (esbuild) so DTO files authored in TypeScript — including
 * `experimentalDecorators` and definite-assignment fields — run without a
 * separate build, triggering `@Model` decorator registration as a side effect.
 *
 * @param entry - Absolute or relative path to the DTO entry module.
 * @returns The module's exports.
 */
export async function loadEntry(entry: string): Promise<Record<string, unknown>> {
    const absolute = resolve('.', entry);
    // tsx resolves the entry and its imports relative to the current working directory.
    const parentUrl = pathToFileURL(resolve('.', 'index.js')).href;
    return tsImport(pathToFileURL(absolute).href, parentUrl) as Promise<Record<string, unknown>>;
}
