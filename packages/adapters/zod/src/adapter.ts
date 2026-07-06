import type {
    ConstraintMetadata,
    FieldMetadata,
    ModelMetadata,
    ModelTarget,
    ValidationIssue,
    ValidationOptions,
    ValidatorAdapter
} from '@hermiforge-decorix/core';
import {
    buildValidationContext,
    getModelMetadata,
    hasAsyncConstraints,
    normalizeConstraintIssue,
    registerValidatorAdapter,
    resolveConstraintDefinition,
    setDefaultValidatorAdapter
} from '@hermiforge-decorix/core';
import {z} from 'zod';
import type {
    DecorixZodRegistrationOptions,
    DecorixZodSchema,
    DecorixZodValidatorAdapterOptions,
    DecorixZodValidatorSchema
} from './types';

/** Mutable holder threading per-validation options into schema refinements built ahead of time. */
type OptionsRef = {current?: ValidationOptions};

/** Fixed empty options used when a Zod schema is built outside the validator adapter. */
const STATIC_OPTIONS: OptionsRef = {};

/**
 * Converts Decorix metadata or a registered model class into a Zod object schema.
 */
export function toZod(modelOrMetadata: ModelTarget | ModelMetadata): DecorixZodSchema {
    return buildZodSchema(getModelMetadata(modelOrMetadata), STATIC_OPTIONS);
}

/**
 * Converts a single Decorix field into a Zod schema.
 */
export function toZodField(field: FieldMetadata): z.ZodTypeAny {
    return buildFieldSchema(field, STATIC_OPTIONS);
}

/**
 * Creates a validator adapter backed by generated Zod schemas.
 *
 * The adapter exposes both a synchronous `validate` and an asynchronous
 * `validateAsync`. Models containing async constraints reject the sync path and
 * must use `validateAsync`, which parses through Zod's `safeParseAsync`.
 */
export function createZodValidatorAdapter(
    options: DecorixZodValidatorAdapterOptions = {}
): ValidatorAdapter<DecorixZodValidatorSchema> {
    return {
        name: options.name ?? 'zod',
        createSchema(metadata) {
            // A per-schema options ref lets pre-built refinements read the current validation options.
            const optionsRef: OptionsRef = {};
            const zodSchema = buildZodSchema(metadata, optionsRef);
            const isAsync = hasAsyncConstraints(metadata);
            return {
                zodSchema,
                validate(value, validateOptions) {
                    if (isAsync) {
                        throw new Error(`Decorix model "${metadata.name}" has async constraints. Use validateAsync instead.`);
                    }
                    optionsRef.current = validateOptions;
                    const result = zodSchema.safeParse(value);
                    return toValidationResult(result);
                },
                async validateAsync(value, validateOptions) {
                    optionsRef.current = validateOptions;
                    const result = await zodSchema.safeParseAsync(value);
                    return toValidationResult(result);
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

/** Normalizes a Zod parse result into the framework-neutral Decorix result shape. */
function toValidationResult(result: z.ZodSafeParseResult<unknown>) {
    if (result.success) return {success: true as const, data: result.data};
    return {success: false as const, issues: result.error.issues.map(toValidationIssue)};
}

/** Builds a Zod object schema for a model, including object-level constraints. */
function buildZodSchema(metadata: ModelMetadata, optionsRef: OptionsRef): DecorixZodSchema {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const field of metadata.fields) {
        shape[field.name] = buildFieldSchema(field, optionsRef);
    }
    return applyObjectConstraints(z.object(shape), metadata, optionsRef) as DecorixZodSchema;
}

/** Builds the Zod schema for one field, including constraints and optionality. */
function buildFieldSchema(field: FieldMetadata, optionsRef: OptionsRef): z.ZodTypeAny {
    let schema = baseSchema(field, optionsRef);
    for (const constraint of field.constraints) {
        schema = applyConstraint(schema, constraint, field.name, optionsRef);
    }
    return field.required && !field.constraints.some((constraint) => constraint.name === 'optional') ? schema : schema.optional();
}

/** Maps a Decorix field type to its base Zod schema before constraints are applied. */
function baseSchema(field: FieldMetadata, optionsRef: OptionsRef): z.ZodTypeAny {
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
            return z.array(buildFieldSchema({...field.item, required: true}, optionsRef));
        case 'object': {
            const shape: Record<string, z.ZodTypeAny> = {};
            for (const child of field.fields ?? []) shape[child.name] = buildFieldSchema(child, optionsRef);
            return z.object(shape);
        }
        default: return assertNever(field.type);
    }
}

/** Applies a native Zod mapping when possible or delegates to Decorix fallback validation. */
function applyConstraint(schema: z.ZodTypeAny, constraint: ConstraintMetadata, property: string, optionsRef: OptionsRef): z.ZodTypeAny {
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
        case 'notOneOf':
            return schema.refine((value) => !(constraint.options as readonly unknown[]).includes(value), message(constraint));
        default:
            // Unsupported native/custom constraints remain enforced through a Zod custom issue.
            return applyCustomConstraint(schema, constraint, property, optionsRef);
    }
}

/** Enforces non-native constraints through Zod superRefine, awaiting async definitions. */
function applyCustomConstraint(schema: z.ZodTypeAny, constraint: ConstraintMetadata, property: string, optionsRef: OptionsRef): z.ZodTypeAny {
    const definition = resolveConstraintDefinition(constraint);
    return schema.superRefine((value, ctx) => {
        const context = buildValidationContext({}, value, property, optionsRef.current);
        const result = definition.validate(value, constraint.options, context);
        // Async constraint results are awaited; Zod only reaches this branch during safeParseAsync.
        if (result instanceof Promise) {
            return result.then((resolved) => reportIssue(ctx, normalizeConstraintIssue(resolved, definition, constraint, context, [])));
        }
        reportIssue(ctx, normalizeConstraintIssue(result, definition, constraint, context, []));
        return undefined;
    });
}

/** Enforces model-level constraints through a Zod object refinement, awaiting async definitions. */
function applyObjectConstraints(schema: z.ZodTypeAny, metadata: ModelMetadata, optionsRef: OptionsRef): z.ZodTypeAny {
    if (!metadata.objectConstraints?.length) return schema;
    return schema.superRefine((value, ctx) => {
        const pending: Array<Promise<void>> = [];
        for (const constraint of metadata.objectConstraints ?? []) {
            const definition = resolveConstraintDefinition(constraint);
            const context = buildValidationContext({}, value, metadata.name, optionsRef.current);
            const result = definition.validate(value, constraint.options, context);
            if (result instanceof Promise) {
                pending.push(result.then((resolved) => reportIssue(ctx, normalizeConstraintIssue(resolved, definition, constraint, context, []))));
            } else {
                reportIssue(ctx, normalizeConstraintIssue(result, definition, constraint, context, []));
            }
        }
        // A single awaited promise keeps every async object constraint on the async parse path.
        if (pending.length) return Promise.all(pending).then(() => undefined);
        return undefined;
    });
}

/** Adds a normalized Decorix issue to the Zod refinement context when validation failed. */
function reportIssue(ctx: z.RefinementCtx, issue: ValidationIssue | undefined): void {
    if (issue) addDecorixIssue(ctx, issue);
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
