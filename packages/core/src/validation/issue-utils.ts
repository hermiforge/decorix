import type {ConstraintDefinition, ConstraintMetadata, ValidationContext, ValidationIssueInput} from '../metadata/types';
import {defaultConstraintRegistry, type ConstraintRegistry} from './constraint-registry';
import type {ValidationIssue, ValidationOptions} from './types';

/**
 * Resolves a constraint definition from a registry or throws an actionable error.
 *
 * Shared by the core validation engine and adapters that run constraints
 * outside the standard traversal (Zod `superRefine`, Angular `ValidatorFn`),
 * so every caller fails the same way on an unregistered constraint name.
 */
export function resolveConstraintDefinition(constraint: ConstraintMetadata, registry: ConstraintRegistry = defaultConstraintRegistry): ConstraintDefinition {
    const definition = registry.get(constraint.name);
    if (!definition) {
        throw new Error(`No Decorix constraint registered for "${constraint.name}".`);
    }
    return definition;
}

/**
 * Builds the runtime context passed into a constraint definition's `validate`/`message`.
 */
export function buildValidationContext(root: unknown, value: unknown, property: string, options: ValidationOptions = {}): ValidationContext {
    return {object: root, property, value, group: options.group, locale: options.locale, services: options.services};
}

/**
 * Resolves a constraint definition's message, invoking a message function when one is configured.
 */
export function messageForConstraint(definition: ConstraintDefinition, options: unknown, context: ValidationContext): string {
    if (typeof definition.message === 'function') {
        return definition.message(options, context);
    }
    return definition.message ?? `Value failed ${definition.name} validation.`;
}

/**
 * Normalizes raw constraint options into issue params: plain objects are spread,
 * primitives/RegExp/Date are wrapped under a `value` key.
 */
export function paramsForConstraintOptions(options: unknown): Record<string, unknown> | undefined {
    if (options === undefined) return undefined;
    if (typeof options === 'object' && options !== null && !Array.isArray(options) && !(options instanceof RegExp) && !(options instanceof Date)) {
        return {...options as Record<string, unknown>};
    }
    return {value: options};
}

/**
 * Normalizes a constraint's boolean/issue-input result into a stable {@link ValidationIssue}.
 *
 * Shared across the core engine and adapters (Zod, Angular Reactive) that run
 * constraints outside the standard traversal, so a future change to issue
 * shape only has to happen in one place.
 *
 * @param path - Issue path when the caller already knows it (e.g. traversal depth).
 * Defaults to `[context.property]` (or `[]` when the context has no property),
 * matching adapters that only validate a single field/object in isolation.
 */
export function normalizeConstraintIssue(
    result: boolean | ValidationIssueInput,
    definition: ConstraintDefinition,
    constraint: ConstraintMetadata,
    context: ValidationContext,
    path: Array<string | number> = context.property !== undefined ? [context.property] : []
): ValidationIssue | undefined {
    if (result === true) return undefined;
    const input = result === false ? {} : result;
    return {
        path: input.path ?? path,
        code: input.code ?? `decorix.${constraint.name}`,
        message: constraint.message ?? input.message ?? messageForConstraint(definition, constraint.options, context),
        constraint: constraint.name,
        params: input.params ?? paramsForConstraintOptions(constraint.options)
    };
}
