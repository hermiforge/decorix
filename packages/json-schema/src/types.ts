/**
 * Minimal JSON Schema draft 2020-12 object used by Decorix.
 */
export type JsonSchema = {
    $schema?: string;
    title?: string;
    type?: string | string[];
    properties?: Record<string, JsonSchema>;
    required?: string[];
    items?: JsonSchema;
    enum?: readonly string[];
    format?: string;
    minLength?: number;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
    pattern?: string;
    description?: string;
    readOnly?: boolean;
    deprecated?: boolean;
    [extension: `x-${string}`]: unknown;
};
