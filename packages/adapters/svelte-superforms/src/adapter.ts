import {getModelMetadata, resolveSchema, runSchemaAsync} from '@hermiforge-decorix/core';
import {toJsonSchema} from '@hermiforge-decorix/json-schema';
import type {ValidationAdapter} from 'sveltekit-superforms/adapters';
import {defaultsForModel} from './defaults';
import {constraintsForModel, shapeForModel} from './shape';
import type {DecorixSuperformsModel, DecorixSuperformsOptions} from './types';

/**
 * Converts Decorix metadata or a registered model class into a Superforms
 * `ValidationAdapter`, Superforms' own contract for a schema library
 * integration (the same shape its built-in `zod()`/`valibot()` helpers
 * return) — analogous to `@hermiforge-decorix/zod`'s
 * `createZodValidatorAdapter`, not the passive config-shaped pattern used by
 * the FormKit/Felte/Modular Forms adapters, since Superforms itself requires
 * this exact contract from `superValidate(adapter)`/`superForm`.
 *
 * `createAdapter`/`constraints`/`schemaShape`/`defaultValues`, the helpers
 * Superforms' own built-in adapters use to derive `constraints`/`shape`/
 * `defaults` from a JSON Schema, are not part of `sveltekit-superforms/adapters`'s
 * public API (verified against the installed package's
 * `dist/adapters/index.js`) — this builds the equivalent fields directly
 * from Decorix field metadata instead (see `./defaults.ts`, `./shape.ts`).
 *
 * @param options.initialValues - Overrides the type-appropriate per-field
 * defaults (`''` for strings, `0` for numbers, `false` for booleans, ...)
 * this adapter generates otherwise.
 */
export function createSuperformsValidatorAdapter(
    modelOrMetadata: DecorixSuperformsModel,
    options: DecorixSuperformsOptions = {}
): ValidationAdapter<Record<string, unknown>> {
    const metadata = getModelMetadata(modelOrMetadata);
    const validatorSchema = resolveSchema(metadata, options.validator);

    const adapter = {
        superFormValidationLibrary: 'custom' as const,
        async validate(data: unknown) {
            const result = await runSchemaAsync(validatorSchema, data);
            if (result.success) return {success: true as const, data: result.data as Record<string, unknown>};
            return {success: false as const, issues: result.issues.map((issue) => ({path: issue.path, message: issue.message}))};
        },
        jsonSchema: toJsonSchema(metadata),
        defaults: defaultsForModel(metadata, options.initialValues),
        constraints: constraintsForModel(metadata),
        shape: shapeForModel(metadata),
        id: metadata.name
    };

    return adapter as unknown as ValidationAdapter<Record<string, unknown>>;
}
