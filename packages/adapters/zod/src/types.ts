import type {ValidatorSchema} from '@decorix/core';
import type {z} from 'zod';

/**
 * Zod object schema generated from a Decorix model.
 */
export type DecorixZodSchema = z.ZodObject<Record<string, z.ZodTypeAny>>;

/**
 * Framework-neutral validator facade backed by a Zod schema.
 */
export type DecorixZodValidatorSchema = ValidatorSchema & {
    readonly zodSchema: DecorixZodSchema;
};

/**
 * Options used when creating the Zod validator adapter.
 */
export type DecorixZodValidatorAdapterOptions = {
    name?: string;
};

/**
 * Options used when registering the Zod validator adapter globally.
 */
export type DecorixZodRegistrationOptions = DecorixZodValidatorAdapterOptions & {
    setDefault?: boolean;
};
