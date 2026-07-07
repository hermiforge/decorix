import {dirname, isAbsolute, join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {register} from 'tsx/esm/api';
import {createFilesMatcher, getTsconfig, parseTsconfig} from 'get-tsconfig';
import type {TsConfigResult} from 'get-tsconfig';
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
 * Finds the tsconfig that actually covers `entryPath`, following TS project
 * `references` when the given tsconfig doesn't (e.g. an Angular/Nx-style root
 * `tsconfig.json` with `"files": []` that only exists to list references to
 * `tsconfig.app.json`/`tsconfig.spec.json`). Falls back to `found` itself when
 * no reference matches, preserving prior behavior for that case.
 *
 * @param entryPath - Absolute path to the file being loaded.
 * @param found - The tsconfig to start from.
 * @param visited - Internal recursion guard against reference cycles.
 * @returns The most specific tsconfig covering `entryPath` that could be found.
 */
function resolveApplicableTsconfig(entryPath: string, found: TsConfigResult, visited: Set<string> = new Set()): TsConfigResult {
    if (visited.has(found.path) || createFilesMatcher(found)(entryPath) !== undefined) return found;
    visited.add(found.path);
    const baseDir = dirname(found.path);
    for (const reference of found.config.references ?? []) {
        const referencePath = isAbsolute(reference.path) ? reference.path : resolve(baseDir, reference.path);
        const configPath = referencePath.endsWith('.json') ? referencePath : join(referencePath, 'tsconfig.json');
        let referenced: TsConfigResult;
        try {
            referenced = {path: configPath, config: parseTsconfig(configPath)};
        } catch {
            continue;
        }
        const resolved = resolveApplicableTsconfig(entryPath, referenced, visited);
        if (createFilesMatcher(resolved)(entryPath) !== undefined) return resolved;
    }
    return found;
}

/**
 * Loads a TypeScript or JavaScript entry module and returns its exports.
 *
 * Uses tsx (esbuild) so DTO files authored in TypeScript — including
 * `experimentalDecorators` and definite-assignment fields — run without a
 * separate build, triggering `@Model` decorator registration as a side effect.
 *
 * Decorix decorators are legacy TypeScript decorators (`(target, propertyKey)`),
 * so esbuild must emit with `experimentalDecorators`. tsx only applies a
 * tsconfig's `compilerOptions` to a file when that tsconfig's `files`/`include`
 * actually covers it (`get-tsconfig`'s `createFilesMatcher`) — a root
 * `tsconfig.json` with `"files": []` (the Angular CLI/Nx convention: real
 * coverage lives in referenced `tsconfig.app.json`/`tsconfig.spec.json`) covers
 * nothing, so tsx silently falls back to TC39 standard decorators and crashes
 * registration. `resolveApplicableTsconfig` follows `references` to find the
 * config that actually covers the entry file before handing it to tsx.
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
    let found: TsConfigResult | undefined;
    try {
        if (tsconfigPath) {
            const explicit = resolve('.', tsconfigPath);
            found = {path: explicit, config: parseTsconfig(explicit)};
        } else {
            found = getTsconfig(dirname(absolute)) ?? getTsconfig(resolve('.')) ?? undefined;
        }
    } catch {
        found = undefined;
    }
    const tsconfig = found ? resolveApplicableTsconfig(absolute, found).path : tsconfigPath && resolve('.', tsconfigPath);
    // When no tsconfig is found, leave tsx to its default discovery rather than forcing a config that could break resolution.
    const unregister = register(tsconfig ? {tsconfig} : {});
    try {
        return (await import(pathToFileURL(absolute).href)) as Record<string, unknown>;
    } finally {
        await unregister();
    }
}
