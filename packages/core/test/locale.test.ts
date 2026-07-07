import {describe, expect, it} from 'vitest';
import {LocaleRegistry, registerLocale, validate, type ConstraintMetadata, type FieldMetadata, type ModelMetadata} from '../src/index';

function fieldFor(constraint: ConstraintMetadata, extra: ConstraintMetadata[] = []): FieldMetadata {
    const required = constraint.name === 'required' || constraint.name === 'notNull';
    return {name: 'value', type: 'string', required, constraints: [constraint, ...extra]};
}

function metadataFor(name: string, constraint: ConstraintMetadata, extra: ConstraintMetadata[] = []): ModelMetadata {
    return {name, fields: [fieldFor(constraint, extra)]};
}

describe('locale messages', () => {
    it('falls back to the English default when no locale is set', () => {
        const meta = metadataFor('LocaleDefaultDto', {name: 'required'});
        const result = validate({value: undefined}, meta);
        expect(result.success).toBe(false);
        if (!result.success) expect(result.issues[0].message).toBe('Value is required.');
    });

    it('falls back to English when the locale has no translation for the constraint', () => {
        registerLocale('fr', {required: 'Cette valeur est requise.'});
        const meta = metadataFor('LocaleUnknownLocaleDto', {name: 'required'});
        const result = validate({value: undefined}, meta, {locale: 'de'});
        expect(result.success).toBe(false);
        if (!result.success) expect(result.issues[0].message).toBe('Value is required.');
    });

    it('uses the registered translation when locale and constraint both match', () => {
        registerLocale('fr', {required: 'Cette valeur est requise.'});
        const meta = metadataFor('LocaleMatchDto', {name: 'required'});
        const result = validate({value: undefined}, meta, {locale: 'fr'});
        expect(result.success).toBe(false);
        if (!result.success) expect(result.issues[0].message).toBe('Cette valeur est requise.');
    });

    it('supports parameterized locale messages via a factory function', () => {
        registerLocale<number>('fr', {minLength: (min) => `La valeur doit contenir au moins ${min} caractères.`});
        const meta = metadataFor('LocaleParamDto', {name: 'minLength', options: 3});
        const result = validate({value: 'ab'}, meta, {locale: 'fr'});
        expect(result.success).toBe(false);
        if (!result.success) expect(result.issues[0].message).toBe('La valeur doit contenir au moins 3 caractères.');
    });

    it('never overrides an explicit user message, even with a matching locale translation', () => {
        registerLocale('fr', {min: 'Traduction FR.'});
        const meta = metadataFor('LocaleOverrideDto', {name: 'min', options: 18, message: 'Message custom'});
        const result = validate({value: 10}, meta, {locale: 'fr'});
        expect(result.success).toBe(false);
        if (!result.success) expect(result.issues[0].message).toBe('Message custom');
    });

    it('scopes lookups to an isolated LocaleRegistry passed via ValidationOptions', () => {
        const isolated = new LocaleRegistry();
        isolated.register('fr', {required: 'Isole.'});
        const meta = metadataFor('LocaleIsolatedDto', {name: 'required'});
        const globalScoped = validate({value: undefined}, meta, {locale: 'fr'});
        const isolatedScoped = validate({value: undefined}, meta, {locale: 'fr', localeRegistry: isolated});
        if (!globalScoped.success) expect(globalScoped.issues[0].message).not.toBe('Isole.');
        if (!isolatedScoped.success) expect(isolatedScoped.issues[0].message).toBe('Isole.');
    });

    it('LocaleRegistry.register merges into an existing locale bucket instead of throwing', () => {
        const registry = new LocaleRegistry();
        registry.register('fr', {required: 'A'});
        registry.register('fr', {min: 'B'});
        expect(registry.get('fr', 'required')).toBe('A');
        expect(registry.get('fr', 'min')).toBe('B');
        expect(registry.hasLocale('fr')).toBe(true);
        expect(registry.hasLocale('de')).toBe(false);
    });
});
