import type {ConstraintDefinition} from '../metadata/types';

/**
 * In-memory registry of Decorix constraint definitions.
 *
 * Registries map metadata names to executable validation definitions so core
 * validation and adapter fallbacks share one source of constraint semantics.
 */
export class ConstraintRegistry {
    private readonly definitions = new Map<string, ConstraintDefinition>();

    /**
     * Registers a new constraint definition.
     *
     * @param definition - Field or object constraint definition to register.
     * @returns The same definition for decorator/helper composition.
     */
    register<TValue, TOptions>(definition: ConstraintDefinition<TValue, TOptions>): ConstraintDefinition<TValue, TOptions> {
        if (!definition.name.trim()) {
            throw new Error('Decorix constraints must declare a non-empty name.');
        }
        if (this.definitions.has(definition.name)) {
            throw new Error(`Decorix constraint "${definition.name}" is already registered.`);
        }
        this.definitions.set(definition.name, definition as ConstraintDefinition);
        return definition;
    }

    /**
     * Looks up a registered constraint by metadata name.
     */
    get(name: string): ConstraintDefinition | undefined {
        return this.definitions.get(name);
    }

    /**
     * Returns whether a registered constraint requires async validation.
     */
    hasAsync(name: string): boolean {
        return this.definitions.get(name)?.async === true;
    }

    /**
     * Returns all registered definitions in registration order.
     */
    entries(): ConstraintDefinition[] {
        return [...this.definitions.values()];
    }
}

/** Default process-wide constraint registry used by Decorix helpers. */
export const defaultConstraintRegistry = new ConstraintRegistry();

/**
 * Registers a constraint definition in a registry.
 */
export function registerConstraint<TValue, TOptions>(
    definition: ConstraintDefinition<TValue, TOptions>,
    registry = defaultConstraintRegistry
): ConstraintDefinition<TValue, TOptions> {
    return registry.register(definition);
}

/**
 * Retrieves a constraint definition from a registry.
 */
export function getConstraint(name: string, registry = defaultConstraintRegistry): ConstraintDefinition | undefined {
    return registry.get(name);
}

/**
 * Creates and registers a synchronous field constraint.
 *
 * @param definition - Field constraint definition without the fixed `kind`.
 * @param registry - Target registry. Defaults to the process-wide registry.
 */
export function createConstraint<TValue, TOptions>(
    definition: Omit<ConstraintDefinition<TValue, TOptions>, 'kind'> & {kind?: 'field'},
    registry = defaultConstraintRegistry
): ConstraintDefinition<TValue, TOptions> {
    return registerConstraint({...definition, kind: 'field'}, registry);
}

/**
 * Creates and registers a synchronous object-level constraint.
 *
 * @param definition - Object constraint definition without the fixed `kind`.
 * @param registry - Target registry. Defaults to the process-wide registry.
 */
export function createObjectConstraint<TValue, TOptions>(
    definition: Omit<ConstraintDefinition<TValue, TOptions>, 'kind'> & {kind?: 'object'},
    registry = defaultConstraintRegistry
): ConstraintDefinition<TValue, TOptions> {
    return registerConstraint({...definition, kind: 'object'}, registry);
}

/**
 * Creates and registers an asynchronous field constraint.
 *
 * @param definition - Field constraint definition without the fixed `kind`/`async`.
 * @param registry - Target registry. Defaults to the process-wide registry.
 */
export function createAsyncConstraint<TValue, TOptions>(
    definition: Omit<ConstraintDefinition<TValue, TOptions>, 'kind' | 'async'> & {kind?: 'field'},
    registry = defaultConstraintRegistry
): ConstraintDefinition<TValue, TOptions> {
    return registerConstraint({...definition, kind: 'field', async: true}, registry);
}
