import {createConstraintDecorator} from '../decorators/constraints';
import {createConstraintMetadata, normalizeConstraintOptions, type ConstraintOptions} from '../metadata/constraints';
import type {ConstraintDefinition, ConstraintMetadata} from '../metadata/types';
import {createAsyncConstraint, createConstraint, defaultConstraintRegistry, type ConstraintRegistry} from './constraint-registry';

/** Message string or `{ message, groups }` metadata accepted by reusable constraints. */
type OptionsArg = string | ConstraintOptions;

/**
 * A registered, reusable field constraint that can be applied as a decorator,
 * as a builder metadata factory, or as raw metadata.
 */
export interface ReusableConstraint {
    /** Registered constraint name, unique within its registry. */
    readonly name: string;
    /**
     * Property decorator applying the constraint to a `@Model` field.
     *
     * @param arg - Per-usage message string or `{ message, groups }` override.
     */
    readonly decorator: (arg?: OptionsArg) => PropertyDecorator;
    /**
     * Builds constraint metadata for builder `.constraint(...)` reuse or for
     * model-level `objectConstraints` arrays.
     *
     * @param arg - Per-usage message string or `{ message, groups }` override.
     */
    readonly constraint: (arg?: OptionsArg) => ConstraintMetadata;
}

/**
 * Registers a synchronous field constraint and returns reusable authoring tools.
 *
 * This is the primary "define once, reuse everywhere" custom-constraint entry
 * point: it registers the definition (enforcing unique names within the target
 * registry) and hands back a decorator plus a metadata factory that both apply
 * the constraint by name. A user message override always takes precedence over
 * the definition's default message during validation.
 *
 * @param definition - Field constraint definition (name, `validate`, optional `message`/`toJsonSchema`).
 * @param registry - Target registry. Defaults to the process-wide registry.
 * @returns A {@link ReusableConstraint} exposing `name`, `decorator`, and `constraint`.
 */
export function defineConstraint<TValue, TOptions>(
    definition: Omit<ConstraintDefinition<TValue, TOptions>, 'kind'> & {kind?: 'field'},
    registry: ConstraintRegistry = defaultConstraintRegistry
): ReusableConstraint {
    const registered = createConstraint(definition, registry);
    return toReusableConstraint(registered.name);
}

/**
 * Registers an asynchronous field constraint and returns reusable authoring tools.
 *
 * Async constraints are rejected by the synchronous `validate` and resolved by
 * `validateAsync`. See {@link defineConstraint} for authoring semantics.
 *
 * @param definition - Field constraint definition (name, async `validate`, optional `message`/`toJsonSchema`).
 * @param registry - Target registry. Defaults to the process-wide registry.
 * @returns A {@link ReusableConstraint} exposing `name`, `decorator`, and `constraint`.
 */
export function defineAsyncConstraint<TValue, TOptions>(
    definition: Omit<ConstraintDefinition<TValue, TOptions>, 'kind' | 'async'> & {kind?: 'field'},
    registry: ConstraintRegistry = defaultConstraintRegistry
): ReusableConstraint {
    const registered = createAsyncConstraint(definition, registry);
    return toReusableConstraint(registered.name);
}

/** Builds the decorator/metadata factories bound to a registered constraint name. */
function toReusableConstraint(name: string): ReusableConstraint {
    const decorator = createConstraintDecorator(name);
    return {
        name,
        decorator,
        // Decorators and builders share the same normalized metadata shape.
        constraint: (arg?: OptionsArg) => createConstraintMetadata(name, undefined, normalizeConstraintOptions(arg))
    };
}
