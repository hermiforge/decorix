import type {
    ConstraintMetadata,
    FieldMetadata,
    ModelMetadata,
    ModelTarget,
    ValidationIssue,
    ValidatorAdapter
} from '@decorix/core';
import {getModelMetadata, registerValidatorAdapter, setDefaultValidatorAdapter} from '@decorix/core';
import {z} from 'zod';
import type {
    DecorixZodRegistrationOptions,
    DecorixZodSchema,
    DecorixZodValidatorAdapterOptions,
    DecorixZodValidatorSchema
} from './types';

/**
 * Converts Decorix metadata or a registered model class into a Zod object schema.
 *
 * @param modelOrMetadata - Registered Decorix model target or raw metadata.
 * @returns A Zod object schema equivalent to the Decorix model.
 */
export function toZod(modelOrMetadata: ModelTarget | ModelMetadata): DecorixZodSchema {
    const metadata = getModelMetadata(modelOrMetadata);
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const field of metadata.fields) {
        shape[field.name] = buildFieldSchema(field);
    }

    return z.object(shape);
}

/**
 * Converts one Decorix field into a Zod schema.
 *
 * @param field - Field metadata to convert.
 * @returns A Zod schema for the field, including optionality.
 */
export function toZodField(field: FieldMetadata): z.ZodTypeAny {
    return buildFieldSchema(field);
}

/**
 * Creates a validator adapter backed by Zod.
 *
 * @param options - Adapter creation options.
 * @returns A Decorix validator adapter.
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
                    if (result.success) {
                        return {success: true, data: result.data};
                    }

                    return {success: false, issues: result.error.issues.map(toValidationIssue)};
                }
            };
        }
    };
}

/**
 * Registers the Zod validator adapter in the Decorix global validator registry.
 *
 * @param options - Registration options. The adapter becomes default unless setDefault is false.
 * @returns The registered adapter.
 */
export function registerZodValidator(
    options: DecorixZodRegistrationOptions = {}
): ValidatorAdapter<DecorixZodValidatorSchema> {
    const adapter = registerValidatorAdapter(createZodValidatorAdapter(options)) as ValidatorAdapter<DecorixZodValidatorSchema>;
    if (options.setDefault !== false) {
        setDefaultValidatorAdapter(adapter.name);
    }

    return adapter;
}

function buildFieldSchema(field: FieldMetadata): z.ZodTypeAny {
    let schema = baseSchema(field);

    for (const constraint of field.constraints) {
        schema = applyConstraint(schema, constraint);
    }

    return field.required ? schema : schema.optional();
}

function baseSchema(field: FieldMetadata): z.ZodTypeAny {
    switch (field.type) {
        case 'string':
            return z.string();
        case 'number':
            return z.number();
        case 'boolean':
            return z.boolean();
        case 'date':
            return z.date();
        case 'enum':
            if (!field.enumValues?.length) {
                throw new Error(`Enum field ${field.name} must declare at least one value.`);
            }
            return z.enum(field.enumValues);
        case 'array':
            if (!field.item) {
                throw new Error(`Array field ${field.name} must declare an item field.`);
            }
            return z.array(buildFieldSchema({...field.item, required: true}));
        case 'object': {
            const shape: Record<string, z.ZodTypeAny> = {};
            for (const child of field.fields ?? []) {
                shape[child.name] = buildFieldSchema(child);
            }
            return z.object(shape);
        }
        default:
            return assertNever(field.type);
    }
}

function applyConstraint(schema: z.ZodTypeAny, constraint: ConstraintMetadata): z.ZodTypeAny {
    switch (constraint.kind) {
        case 'required':
            return schema;
        case 'minLength':
            return schema.pipe(z.string().min(constraint.value, message(constraint)));
        case 'maxLength':
            return schema.pipe(z.string().max(constraint.value, message(constraint)));
        case 'email':
            return schema.pipe(z.string().email(message(constraint)));
        case 'pattern':
            return schema.pipe(z.string().regex(constraint.value, message(constraint)));
        case 'min':
            return schema.pipe(z.number().min(constraint.value, message(constraint)));
        case 'max':
            return schema.pipe(z.number().max(constraint.value, message(constraint)));
        default:
            return assertNever(constraint);
    }
}

function message(constraint: { message?: string }): { message?: string } | undefined {
    return constraint.message ? {message: constraint.message} : undefined;
}

function toValidationIssue(issue: z.core.$ZodIssue): ValidationIssue {
    return {
        path: issue.path.map(normalizePathSegment),
        message: issue.message,
        code: issue.code
    };
}

function normalizePathSegment(segment: PropertyKey): string | number {
    return typeof segment === 'number' ? segment : String(segment);
}

function assertNever(value: never): never {
    throw new Error(`Unsupported Decorix value: ${String(value)}`);
}
