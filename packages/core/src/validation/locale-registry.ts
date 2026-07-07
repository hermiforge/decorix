import type {ValidationContext} from '../metadata/types';

/**
 * Locale-specific message value for one constraint: a literal string or an
 * option-aware factory, mirroring {@link ConstraintDefinition.message}.
 */
export type LocaleMessage<TOptions = unknown> = string | ((options: TOptions, context: ValidationContext) => string);

/**
 * In-memory registry of translated constraint messages, keyed by locale tag
 * then by constraint name.
 *
 * Unlike {@link ConstraintRegistry}, registering the same `(locale, name)`
 * pair twice overwrites the previous entry instead of throwing: locale
 * dictionaries are expected to be assembled incrementally (a base dictionary
 * plus per-app overrides) rather than declared once. Locale tags are matched
 * verbatim against {@link ValidationContext.locale} — there is no normalization
 * or fallback (e.g. `fr-FR` to `fr`); a consumer that wants that behavior
 * should register both tags or normalize before calling `validate`.
 */
export class LocaleRegistry {
    private readonly locales = new Map<string, Map<string, LocaleMessage>>();

    /**
     * Registers or extends a locale's message dictionary.
     *
     * @param locale - Locale tag (e.g. `'fr'`, `'fr-FR'`), matched verbatim.
     * @param messages - Constraint name to message entries to merge in.
     */
    register<TOptions = unknown>(locale: string, messages: Record<string, LocaleMessage<TOptions>>): void {
        if (!locale.trim()) {
            throw new Error('Decorix locales must declare a non-empty locale tag.');
        }
        const bucket = this.locales.get(locale) ?? new Map<string, LocaleMessage>();
        for (const [name, message] of Object.entries(messages)) {
            bucket.set(name, message as LocaleMessage);
        }
        this.locales.set(locale, bucket);
    }

    /**
     * Looks up a translated message for a constraint name in a locale.
     */
    get(locale: string, name: string): LocaleMessage | undefined {
        return this.locales.get(locale)?.get(name);
    }

    /**
     * Returns whether any messages are registered for a locale.
     */
    hasLocale(locale: string): boolean {
        return this.locales.has(locale);
    }
}

/** Default process-wide locale registry used by Decorix helpers. */
export const defaultLocaleRegistry = new LocaleRegistry();

/**
 * Registers or extends a locale's message dictionary in a registry.
 *
 * @param registry - Target registry. Defaults to the process-wide registry.
 */
export function registerLocale<TOptions = unknown>(
    locale: string,
    messages: Record<string, LocaleMessage<TOptions>>,
    registry = defaultLocaleRegistry
): void {
    registry.register(locale, messages);
}

/**
 * Retrieves a translated message for a constraint name in a locale.
 *
 * @param registry - Source registry. Defaults to the process-wide registry.
 */
export function getLocaleMessage(locale: string, name: string, registry = defaultLocaleRegistry): LocaleMessage | undefined {
    return registry.get(locale, name);
}
