import {toJsonSchema} from '@hermiforge-decorix/json-schema';
import type {DiscoveredModel} from './loader';

/** Selects a discovered model by name, or the sole model when no name is given. */
export function selectModel(models: DiscoveredModel[], modelName?: string): DiscoveredModel {
    if (models.length === 0) throw new Error('No Decorix models found in the entry module.');
    if (modelName) {
        const match = models.find((model) => model.name === modelName || model.exportName === modelName);
        if (!match) throw new Error(`No Decorix model named "${modelName}" found in the entry module.`);
        return match;
    }
    if (models.length > 1) {
        throw new Error(`Multiple models found (${models.map((model) => model.name).join(', ')}). Pass --model to choose one.`);
    }
    return models[0];
}

/** Renders a human-readable summary of the discovered models and their fields. */
export function renderScan(models: DiscoveredModel[]): string {
    if (models.length === 0) return 'No Decorix models found.';
    return models
        .map((model) => {
            const fields = model.metadata.fields.map(renderFieldSummary).join('\n');
            return `${model.name} (export ${model.exportName})\n${fields}`;
        })
        .join('\n\n');
}

/** Renders a single field line for the scan summary. */
function renderFieldSummary(field: DiscoveredModel['metadata']['fields'][number]): string {
    const names = field.constraints.map((constraint) => constraint.name).join(', ');
    const constraints = names ? ` [${names}]` : '';
    return `  - ${field.name}: ${field.type}${constraints}`;
}

/** Renders the JSON Schema artifact for a model (fully serializable). */
export function renderJsonSchema(model: DiscoveredModel): string {
    return JSON.stringify(toJsonSchema(model.metadata), null, 2);
}

/** Renders a thin TypeScript module re-exporting the model's Zod schema. */
export function renderZodModule(entry: string, model: DiscoveredModel): string {
    return [
        `import {toZod} from '@hermiforge-decorix/zod';`,
        `import {${model.exportName}} from '${moduleSpecifier(entry)}';`,
        ``,
        `export const ${model.exportName}Schema = toZod(${model.exportName});`,
        ``
    ].join('\n');
}

/** Renders a thin TypeScript module re-exporting the model's Angular reactive form config. */
export function renderAngularValidatorsModule(entry: string, model: DiscoveredModel): string {
    return [
        `import {toReactiveFormConfig} from '@hermiforge-decorix/angular-reactive';`,
        `import {${model.exportName}} from '${moduleSpecifier(entry)}';`,
        ``,
        `export const ${model.exportName}FormConfig = toReactiveFormConfig(${model.exportName});`,
        ``
    ].join('\n');
}

/** Renders a thin TypeScript module re-exporting the model's Angular Signal Forms facade. */
export function renderAngularSignalModule(entry: string, model: DiscoveredModel): string {
    return [
        `import {toSignalForm} from '@hermiforge-decorix/angular-signal';`,
        `import {${model.exportName}} from '${moduleSpecifier(entry)}';`,
        ``,
        `export const ${model.exportName}Form = toSignalForm(${model.exportName});`,
        ``
    ].join('\n');
}

/** Renders a thin TypeScript module re-exporting the model's React Hook Form config. */
export function renderReactHookFormModule(entry: string, model: DiscoveredModel): string {
    return [
        `import {toReactHookForm} from '@hermiforge-decorix/react-hook-form';`,
        `import {${model.exportName}} from '${moduleSpecifier(entry)}';`,
        ``,
        `export const ${model.exportName}Config = toReactHookForm(${model.exportName});`,
        ``
    ].join('\n');
}

/** Renders a thin TypeScript module re-exporting the model's TanStack Form config. */
export function renderReactTanStackFormModule(entry: string, model: DiscoveredModel): string {
    return [
        `import {toTanStackForm} from '@hermiforge-decorix/react-tanstack-form';`,
        `import {${model.exportName}} from '${moduleSpecifier(entry)}';`,
        ``,
        `export const ${model.exportName}Config = toTanStackForm(${model.exportName});`,
        ``
    ].join('\n');
}

/** Renders a thin TypeScript module re-exporting the model's FormKit schema config. */
export function renderVueFormKitModule(entry: string, model: DiscoveredModel): string {
    return [
        `import {toFormKit} from '@hermiforge-decorix/vue-formkit';`,
        `import {${model.exportName}} from '${moduleSpecifier(entry)}';`,
        ``,
        `export const ${model.exportName}Config = toFormKit(${model.exportName});`,
        ``
    ].join('\n');
}

/** Renders a thin TypeScript module re-exporting the model's VeeValidate config. */
export function renderVueVeeValidateModule(entry: string, model: DiscoveredModel): string {
    return [
        `import {toVeeValidate} from '@hermiforge-decorix/vue-vee-validate';`,
        `import {${model.exportName}} from '${moduleSpecifier(entry)}';`,
        ``,
        `export const ${model.exportName}Config = toVeeValidate(${model.exportName});`,
        ``
    ].join('\n');
}

/** Renders a thin TypeScript module re-exporting the model's Nest validation pipe. */
export function renderNestModule(entry: string, model: DiscoveredModel): string {
    return [
        `import {DecorixPipe} from '@hermiforge-decorix/nest';`,
        `import {${model.exportName}} from '${moduleSpecifier(entry)}';`,
        ``,
        `export const ${model.exportName}Pipe = DecorixPipe(${model.exportName});`,
        ``
    ].join('\n');
}

/** Normalizes an entry path into an import specifier, dropping a TypeScript extension. */
function moduleSpecifier(entry: string): string {
    const normalized = entry.replace(/\\/g, '/').replace(/\.(ts|tsx|mts|cts)$/, '');
    // Relative specifiers keep an explicit leading segment so generated modules resolve as siblings.
    return /^(\.|\/|[a-zA-Z]:)/.test(normalized) ? normalized : `./${normalized}`;
}
