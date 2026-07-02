import type {
    ConstraintDefinition,
    ConstraintMetadata,
    FieldMetadata,
    ModelMetadata,
    ModelTarget,
    ValidationContext,
    ValidationIssue,
    ValidationIssueInput,
    ValidatorAdapter
} from '@decorix/core';
import {getConstraint, getModelMetadata, registerValidatorAdapter, setDefaultValidatorAdapter} from '@decorix/core';
import {z} from 'zod';
import type {
    DecorixZodRegistrationOptions,
    DecorixZodSchema,
    DecorixZodValidatorAdapterOptions,
    DecorixZodValidatorSchema
} from './types';

/**
 * Converts Decorix metadata or a registered model class into a Zod object schema.
 */
export function toZod(modelOrMetadata: ModelTarget | ModelMetadata): DecorixZodSchema {
    const metadata = getModelMetadata(modelOrMetadata);
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const field of metadata.fields) {
        shape[field.name] = buildFieldSchema(field);
    }
    return applyObjectConstraints(z.object(shape), metadata) as DecorixZodSchema;
}

/**
 * Converts a single Decorix field into a Zod schema.
 */
export function toZodField(field: FieldMetadata): z.ZodTypeAny {
    return buildFieldSchema(field);
}

/**
 * Creates a validator adapter backed by generated Zod schemas.
 */
export function createZodValidatorAdapter(
    options: DecorixZodValidatorAdapterOptions = {}
): ValidatorAdapter<DecorixZodValidatorSchema> {
    return {
        name: options.name ?? 'zod',
        createSchema(metadata) {
            const zodSchema = toZod(metadata);
            return {
                zodSchema,
                validate(value) {
                    const result = zodSchema.safeParse(value);
                    if (result.success) return {success: true, data: result.data};
                    return {success: false, issues: result.error.issues.map(toValidationIssue)};
                }
            };
        }
    };
}

/**
 * Registers the Zod validator adapter with the global Decorix adapter registry.
 */
export function registerZodValidator(
    options: DecorixZodRegistrationOptions = {}
): ValidatorAdapter<DecorixZodValidatorSchema> {
    const adapter = registerValidatorAdapter(createZodValidatorAdapter(options)) as ValidatorAdapter<DecorixZodValidatorSchema>;
    if (options.setDefault !== false) setDefaultValidatorAdapter(adapter.name);
    return adapter;
}

/** Builds the Zod schema for one field, including constraints and optionality. */
function buildFieldSchema(field: FieldMetadata): z.ZodTypeAny {
    let schema = baseSchema(field);
    for (const constraint of field.constraints) {
        schema = applyConstraint(schema, constraint, field.name);
    }
    return field.required && !field.constraints.some((constraint) => constraint.name === 'optional') ? schema : schema.optional();
}

/** Maps a Decorix field type to its base Zod schema before constraints are applied. */
function baseSchema(field: FieldMetadata): z.ZodTypeAny {
    switch (field.type) {
        case 'string': return z.string();
        case 'number': return z.number();
        case 'boolean': return z.boolean();
        case 'date': return z.date();
        case 'enum':
            if (!field.enumValues?.length) throw new Error(`Enum field ${field.name} must declare at least one value.`);
            return z.enum(field.enumValues);
        case 'array':
            if (!field.item) throw new Error(`Array field ${field.name} must declare an item field.`);
            return z.array(buildFieldSchema({...field.item, required: true}));
        case 'object': {
            const shape: Record<string, z.ZodTypeAny> = {};
            for (const child of field.fields ?? []) shape[child.name] = buildFieldSchema(child);
            return z.object(shape);
        }
        default: return assertNever(field.type);
    }
}

/** Applies a native Zod mapping when possible or delegates to Decorix fallback validation. */
function applyConstraint(schema: z.ZodTypeAny, constraint: ConstraintMetadata, property: string): z.ZodTypeAny {
    switch (constraint.name) {
        case 'required':
        case 'optional':
            return schema;
        case 'nullable':
            return schema.nullable();
        case 'minLength':
            return schema.pipe(z.string().min(numberOption(constraint), message(constraint)));
        case 'maxLength':
            return schema.pipe(z.string().max(numberOption(constraint), message(constraint)));
        case 'length': {
            const options = objectOption<{min: number; max: number}>(constraint);
            return schema.pipe(z.string().min(options.min, message(constraint)).max(options.max, message(constraint)));
        }
        case 'email':
            return schema.pipe(z.string().email(message(constraint)));
        case 'url':
            return schema.pipe(z.string().url(message(constraint)));
        case 'uuid':
            return schema.pipe(z.string().uuid(message(constraint)));
        case 'pattern':
            return schema.pipe(z.string().regex(regexOption(constraint), message(constraint)));
        case 'min':
            return schema.pipe(z.number().min(numberOption(constraint), message(constraint)));
        case 'max':
            return schema.pipe(z.number().max(numberOption(constraint), message(constraint)));
        case 'between': {
            const options = objectOption<{min: number; max: number}>(constraint);
            return schema.pipe(z.number().min(options.min, message(constraint)).max(options.max, message(constraint)));
        }
        case 'integer':
            return schema.pipe(z.number().int(message(constraint)));
        case 'positive':
            return schema.pipe(z.number().positive(message(constraint)));
        case 'positiveOrZero':
            return schema.pipe(z.number().nonnegative(message(constraint)));
        case 'negative':
            return schema.pipe(z.number().negative(message(constraint)));
        case 'negativeOrZero':
            return schema.pipe(z.number().nonpositive(message(constraint)));
        case 'multipleOf':
            return schema.pipe(z.number().multipleOf(numberOption(constraint), message(constraint)));
        case 'minItems':
            return schema.pipe(z.array(z.unknown()).min(numberOption(constraint), message(constraint)));
        case 'maxItems':
            return schema.pipe(z.array(z.unknown()).max(numberOption(constraint), message(constraint)));
        case 'size': {
            const options = objectOption<{min: number; max: number}>(constraint);
            return schema.pipe(z.array(z.unknown()).min(options.min, message(constraint)).max(options.max, message(constraint)));
        }
        case 'uniqueItems':
            return schema.pipe(z.array(z.unknown()).refine((value) => new Set(value).size === value.length, message(constraint)));
        case 'enum':
        case 'oneOf':
            return schema.refine((value) => (constraint.options as readonly unknown[]).includes(value), message(constraint));
        default:
            // Unsupported native/custom constraints remain enforced through a Zod custom issue.
            return applyCustomConstraint(schema, constraint, property);
    }
}

/** Enforces non-native sync constraints through Zod superRefine. */
function applyCustomConstraint(schema: z.ZodTypeAny, constraint: ConstraintMetadata, property: string): z.ZodTypeAny {
    const definition = getRequiredDefinition(constraint);
    if (definition.async) {
        throw new Error(`Decorix constraint "${constraint.name}" is async and cannot be emitted by the synchronous Zod adapter.`);
    }
    return schema.superRefine((value, ctx) => {
        const context = contextFor(value, property);
        const result = definition.validate(value, constraint.options, context);
        if (result instanceof Promise) {
            throw new Error(`Decorix constraint "${constraint.name}" returned a Promise and cannot be emitted by the synchronous Zod adapter.`);
        }
        const issue = normalizeIssue(result, definition, constraint, context, []);
        if (issue) addDecorixIssue(ctx, issue);
    });
}

/** Enforces model-level constraints through a Zod object refinement. */
function applyObjectConstraints(schema: z.ZodTypeAny, metadata: ModelMetadata): z.ZodTypeAny {
    if (!metadata.objectConstraints?.length) return schema;
    return schema.superRefine((value, ctx) => {
        for (const constraint of metadata.objectConstraints ?? []) {
            const definition = getRequiredDefinition(constraint);
            if (definition.async) {
                throw new Error(`Decorix constraint "${constraint.name}" is async and cannot be emitted by the synchronous Zod adapter.`);
            }
            const context = contextFor(value, metadata.name);
            const result = definition.validate(value, constraint.options, context);
            if (result instanceof Promise) {
                throw new Error(`Decorix constraint "${constraint.name}" returned a Promise and cannot be emitted by the synchronous Zod adapter.`);
            }
            const issue = normalizeIssue(result, definition, constraint, context, []);
            if (issue) addDecorixIssue(ctx, issue);
        }
    });
}

/** Preserves Decorix issue metadata inside a Zod custom issue. */
function addDecorixIssue(ctx: z.RefinementCtx, issue: ValidationIssue): void {
    ctx.addIssue({
        code: 'custom',
        path: issue.path,
        message: issue.message,
        params: {decorixConstraint: issue.constraint, decorixCode: issue.code, decorixParams: issue.params}
    });
}

/** Resolves a constraint definition or fails loudly instead of dropping validation. */
function getRequiredDefinition(constraint: ConstraintMetadata): ConstraintDefinition {
    const definition = getConstraint(constraint.name);
    if (!definition) throw new Error(`No Decorix constraint registered for "${constraint.name}".`);
    return definition;
}

/** Normalizes Decorix constraint output into a stable adapter issue. */
function normalizeIssue(result: boolean | ValidationIssueInput, definition: ConstraintDefinition, constraint: ConstraintMetadata, context: ValidationContext, path: Array<string | number>): ValidationIssue | undefined {
    if (result === true) return undefined;
    const input = result === false ? {} : result;
    return {
        path: input.path ?? path,
        code: input.code ?? `decorix.${constraint.name}`,
        message: constraint.message ?? input.message ?? messageFor(definition, constraint.options, context),
        constraint: constraint.name,
        params: input.params ?? paramsFor(constraint.options)
    };
}

function messageFor(definition: ConstraintDefinition, options: unknown, context: ValidationContext): string {
    if (typeof definition.message === 'function') return definition.message(options, context);
    return definition.message ?? `Value failed ${definition.name} validation.`;
}

function paramsFor(options: unknown): Record<string, unknown> | undefined {
    if (options === undefined) return undefined;
    if (typeof options === 'object' && options !== null && !Array.isArray(options) && !(options instanceof RegExp) && !(options instanceof Date)) {
        return {...options as Record<string, unknown>};
    }
    return {value: options};
}

function contextFor(value: unknown, property: string): ValidationContext {
    return {object: {}, property, value};
}

function numberOption(constraint: ConstraintMetadata): number { return Number(constraint.options); }
function regexOption(constraint: ConstraintMetadata): RegExp { return constraint.options as RegExp; }
function objectOption<T>(constraint: ConstraintMetadata): T { return constraint.options as T; }
function message(constraint: { message?: string }): { message?: string } | undefined { return constraint.message ? {message: constraint.message} : undefined; }

function toValidationIssue(issue: z.core.$ZodIssue): ValidationIssue {
    const params = 'params' in issue ? issue.params as Record<string, unknown> | undefined : undefined;
    return {
        path: issue.path.map(normalizePathSegment),
        message: issue.message,
        code: typeof params?.decorixCode === 'string' ? params.decorixCode : issue.code,
        constraint: typeof params?.decorixConstraint === 'string' ? params.decorixConstraint : issue.code,
        params: typeof params?.decorixParams === 'object' && params.decorixParams !== null ? params.decorixParams as Record<string, unknown> : undefined
    };
}

function normalizePathSegment(segment: PropertyKey): string | number { return typeof segment === 'number' ? segment : String(segment); }
function assertNever(value: never): never { throw new Error(`Unsupported Decorix value: ${String(value)}`); }
