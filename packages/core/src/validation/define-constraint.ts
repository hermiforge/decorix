import {createConstraintDecorator} from '../decorators/constraints';
import {createConstraintMetadata, normalizeConstraintOptions, type ConstraintOptions} from '../metadata/constraints';
import type {ConstraintDefinition, ConstraintMetadata} from '../metadata/types';
import {createAsyncConstraint, createConstraint, defaultConstraintRegistry, type ConstraintRegistry} from './constraint-registry';

/** Message string or `{ message, groups }` metadata accepted by reusable constraints. */
type OptionsArg = string | ConstraintOptions;

/**
 * A registered, reusable field constraint.
 *
 * The value is itself callable so it applies directly as a property decorator —
 * `@StartsWithA()` or `@StartsWithA('override message')` — mirroring the native
 * decorators (`@Required()`, `@Min(3)`). It also carries its registered `name`
 * (so it can be passed by reference to the builder `.constraint(...)` method)
 * and a `constraint(...)` factory for model-level `objectConstraints` arrays.
 *
 * By convention the holding const is PascalCase for decorator ergonomics, while
 * the registered `name` stays camelCase (it surfaces as `issue.constraint` and
 * the `decorix.<name>` issue code).
 */
export interface ReusableConstraint {
    /**
     * Applies the constraint as a property decorator.
     *
     * @param arg - Per-usage message string or `{ message, groups }` override.
     */
    (arg?: OptionsArg): PropertyDecorator;
    /** Registered constraint name, unique within its registry. */
    readonly name: string;
    /**
     * Builds constraint metadata for model-level `objectConstraints` arrays or
     * raw-metadata reuse.
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

/** Builds the callable decorator bound to a registered constraint name, carrying `name` and a metadata factory. */
function toReusableConstraint(name: string): ReusableConstraint {
    const decorator = createConstraintDecorator(name);
    // The reusable IS the decorator factory, so `@X()` works directly.
    const reusable = (arg?: OptionsArg): PropertyDecorator => decorator(arg);
    // `Function.prototype.name` is non-writable, so override it explicitly to expose the registered name.
    Object.defineProperty(reusable, 'name', {value: name, configurable: true});
    // Decorators and builders share the same normalized metadata shape.
    return Object.assign(reusable, {
        constraint: (arg?: OptionsArg) => createConstraintMetadata(name, undefined, normalizeConstraintOptions(arg))
    }) as ReusableConstraint;
}
