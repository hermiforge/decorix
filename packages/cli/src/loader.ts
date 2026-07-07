import {existsSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {register} from 'tsx/esm/api';
import {getModelMetadata, hasModelMetadata, isModelMetadata} from '@hermiforge-decorix/core';
import type {ModelMetadata, ModelTarget} from '@hermiforge-decorix/core';

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
 * Walks up from a directory to find the nearest `tsconfig.json`.
 *
 * @param fromDir - Absolute directory to start searching from.
 * @returns The absolute path to the closest `tsconfig.json`, or `undefined` when none exists up to the filesystem root.
 */
function resolveNearestTsconfig(fromDir: string): string | undefined {
    let current = fromDir;
    // Stop when `dirname` no longer changes the path (filesystem root reached).
    for (;;) {
        const candidate = join(current, 'tsconfig.json');
        if (existsSync(candidate)) return candidate;
        const parent = dirname(current);
        if (parent === current) return undefined;
        current = parent;
    }
}

/**
 * Loads a TypeScript or JavaScript entry module and returns its exports.
 *
 * Uses tsx (esbuild) so DTO files authored in TypeScript — including
 * `experimentalDecorators` and definite-assignment fields — run without a
 * separate build, triggering `@Model` decorator registration as a side effect.
 *
 * Decorix decorators are legacy TypeScript decorators (`(target, propertyKey)`),
 * so esbuild must emit with `experimentalDecorators`. tsx does not reliably apply
 * that flag through its default tsconfig discovery (e.g. a root `tsconfig.json`
 * with `files: []` matches no file), which makes esbuild fall back to TC39
 * standard decorators and crashes registration. We therefore pass an explicit
 * tsconfig: a decorator-using project always sets `experimentalDecorators: true`,
 * so applying its own config is both correct and non-clobbering (its `paths`
 * aliases are preserved).
 *
 * Registers tsx globally via `register()` rather than using the scoped
 * `tsImport()` API: `tsImport()` unconditionally tags every resolved module
 * URL with a `?tsx-namespace=` query so concurrent scoped imports don't
 * collide. That tagging breaks resolution of some prebuilt package exports
 * (observed with `@angular/core`'s `fesm2022` bundle under pnpm), where the
 * query-suffixed specifier fails to resolve even though the equivalent
 * unsuffixed path exists on disk. The CLI only ever loads one entry module
 * per process, so the isolation `tsImport()` provides is unnecessary and
 * `register()` (which skips the namespace tagging when no `namespace` option
 * is passed) sidesteps the bug.
 *
 * @param entry - Absolute or relative path to the DTO entry module.
 * @param tsconfigPath - Optional explicit tsconfig path; defaults to the nearest `tsconfig.json` above the entry file, then above the CWD.
 * @returns The module's exports.
 */
export async function loadEntry(entry: string, tsconfigPath?: string): Promise<Record<string, unknown>> {
    const absolute = resolve('.', entry);
    const tsconfig =
        (tsconfigPath && resolve('.', tsconfigPath)) ??
        resolveNearestTsconfig(dirname(absolute)) ??
        resolveNearestTsconfig(resolve('.'));
    // When no tsconfig is found, leave tsx to its default discovery rather than forcing a config that could break resolution.
    const unregister = register(tsconfig ? {tsconfig} : {});
    try {
        return (await import(pathToFileURL(absolute).href)) as Record<string, unknown>;
    } finally {
        await unregister();
    }
}
