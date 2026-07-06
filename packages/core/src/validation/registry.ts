import type {ValidatorAdapter, ValidatorAdapterRef} from './types';

const validatorAdapters = new Map<string, ValidatorAdapter>();
let defaultValidatorName: string | undefined;

/**
 * Registers a validator adapter globally.
 *
 * @param adapter - Adapter to register.
 * @returns The registered adapter.
 */
export function registerValidatorAdapter(adapter: ValidatorAdapter): ValidatorAdapter {
    if (!adapter.name.trim()) {
        throw new Error('Decorix validator adapters must declare a non-empty name.');
    }

    validatorAdapters.set(adapter.name, adapter);
    return adapter;
}

/**
 * Reads a validator adapter from the global registry.
 *
 * @param name - Registered adapter name.
 * @returns The adapter when one is registered.
 */
export function getValidatorAdapter(name: string): ValidatorAdapter | undefined {
    return validatorAdapters.get(name);
}

/**
 * Selects the global default validator adapter.
 *
 * @param name - Registered adapter name.
 * @returns The selected adapter.
 * @throws Error when the adapter has not been registered.
 */
export function setDefaultValidatorAdapter(name: string): ValidatorAdapter {
    const adapter = getValidatorAdapter(name);
    if (!adapter) {
        throw new Error(`No Decorix validator adapter registered for "${name}".`);
    }

    defaultValidatorName = name;
    return adapter;
}

/**
 * Reads the global default validator adapter.
 *
 * @returns The default adapter when one is configured.
 */
export function getDefaultValidatorAdapter(): ValidatorAdapter | undefined {
    return defaultValidatorName ? getValidatorAdapter(defaultValidatorName) : undefined;
}

/**
 * Resolves an explicit adapter, registered adapter name, or the default adapter.
 *
 * @param adapter - Optional adapter reference.
 * @returns The resolved adapter when one is available.
 */
export function resolveValidatorAdapter(adapter?: ValidatorAdapterRef): ValidatorAdapter | undefined {
    if (!adapter) {
        return getDefaultValidatorAdapter();
    }

    if (typeof adapter !== 'string') {
        return adapter;
    }

    return getValidatorAdapter(adapter);
}

/**
 * Resolves a validator adapter or throws an actionable configuration error.
 *
 * @param adapter - Optional adapter reference.
 * @returns The resolved adapter.
 * @throws Error when no adapter is available.
 */
export function requireValidatorAdapter(adapter?: ValidatorAdapterRef): ValidatorAdapter {
    const resolved = resolveValidatorAdapter(adapter);
    if (resolved) {
        return resolved;
    }

    if (typeof adapter === 'string') {
        throw new Error(`No Decorix validator adapter registered for "${adapter}".`);
    }

    throw new Error(
        'No Decorix validator adapter configured. Pass options.validator or register a default validator adapter.'
    );
}
