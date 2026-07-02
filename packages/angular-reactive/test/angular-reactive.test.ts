import {describe, expect, it} from 'vitest';
import {Email, MinLength, Model, model, numberField, Required, stringField} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toReactiveFormConfig} from '../src/index';
import type {AbstractControl, ValidationErrors, ValidatorFn} from '@angular/forms';

function control(value: unknown): AbstractControl {
    return {value} as AbstractControl;
}

function runValidators(validators: ValidatorFn[], value: unknown): ValidationErrors[] {
    return validators
        .map((validator) => validator(control(value)))
        .filter((error): error is ValidationErrors => error !== null);
}

describe('@decorix/angular-reactive', () => {
    it('creates Angular ValidatorFn field config by default without a runtime validator', () => {
        @Model('SignupDtoAngularValidators')
        class SignupDto {
            @Required('Name required')
            @MinLength(2, 'Name too short')
            name!: string;

            @Required()
            @Email('Invalid email')
            email!: string;
        }

        const config = toReactiveFormConfig(SignupDto, {initialValue: {name: 'Ada'}});
        const name = config.fields[0];
        const email = config.fields[1];

        expect(config.validate).toBeUndefined();
        expect(name).toMatchObject({name: 'name', required: true, initialValue: 'Ada'});
        expect(name?.validators).toHaveLength(2);
        expect(name?.validators.every((validator) => typeof validator === 'function')).toBe(true);
        expect(email?.validators.every((validator) => typeof validator === 'function')).toBe(true);

        expect(runValidators(name?.validators ?? [], 'A')).toEqual([
            {minlength: {requiredLength: 2, actualLength: 1, message: 'Name too short'}}
        ]);
        expect(runValidators(name?.validators ?? [], '')).toEqual([{required: {message: 'Name required'}}]);
        expect(runValidators(name?.validators ?? [], 'Ada')).toEqual([]);
        expect(runValidators(email?.validators ?? [], 'bad')).toEqual([{email: {message: 'Invalid email'}}]);
        expect(runValidators(email?.validators ?? [], '')).toEqual([{required: true}]);
    });

    it('generates Angular-compatible errors for every supported constraint', () => {
        const metadata = model('ReactiveConstraintDto', {
            title: stringField().required('Title required').minLength(2, 'Too short').maxLength(4, 'Too long'),
            email: stringField().email('Bad email').optional(),
            code: stringField().pattern(/^[A-Z]+$/, 'Caps only').optional(),
            age: numberField().min(18, 'Too young').max(65, 'Too old').optional(),
            implicitRequired: stringField().minLength(2, 'Implicit too short')
        });

        const config = toReactiveFormConfig(metadata);
        const byName = Object.fromEntries(config.fields.map((field) => [field.name, field]));

        expect(runValidators(byName.title?.validators ?? [], '')).toEqual([{required: {message: 'Title required'}}]);
        expect(runValidators(byName.title?.validators ?? [], 'A')).toEqual([
            {minlength: {requiredLength: 2, actualLength: 1, message: 'Too short'}}
        ]);
        expect(runValidators(byName.title?.validators ?? [], 'ABCDE')).toEqual([
            {maxlength: {requiredLength: 4, actualLength: 5, message: 'Too long'}}
        ]);
        expect(runValidators(byName.email?.validators ?? [], '')).toEqual([]);
        expect(runValidators(byName.email?.validators ?? [], 'bad')).toEqual([{email: {message: 'Bad email'}}]);
        expect(runValidators(byName.code?.validators ?? [], 'abc')).toEqual([
            {pattern: {requiredPattern: '/^[A-Z]+$/', actualValue: 'abc', message: 'Caps only'}}
        ]);
        expect(runValidators(byName.age?.validators ?? [], 17)).toEqual([{min: {min: 18, actual: 17, message: 'Too young'}}]);
        expect(runValidators(byName.age?.validators ?? [], 66)).toEqual([{max: {max: 65, actual: 66, message: 'Too old'}}]);
        expect(runValidators(byName.implicitRequired?.validators ?? [], '')).toEqual([{required: true}]);
    });

    it('keeps validator descriptors when validationMode is descriptors', () => {
        @Model('SignupDtoDescriptorValidators')
        class SignupDto {
            @Required('Name required')
            @MinLength(2, 'Name too short')
            name!: string;
        }

        const config = toReactiveFormConfig(SignupDto, {validationMode: 'descriptors'});

        expect(config.fields[0]).toMatchObject({
            name: 'name',
            required: true,
            validators: [
                {kind: 'minLength', value: 2, message: 'Name too short'},
                {kind: 'required', message: 'Name required'}
            ]
        });
        expect(config.fields[0]?.validatorDescriptors).toBeUndefined();
    });

    it('exposes ValidatorFn instances and descriptors when validationMode is both', () => {
        const metadata = model('ReactiveBothDto', {
            name: stringField().required('Name required').minLength(2, 'Name too short')
        });

        const config = toReactiveFormConfig(metadata, {validationMode: 'both'});
        const name = config.fields[0];

        expect(name?.validators.every((validator) => typeof validator === 'function')).toBe(true);
        expect(name?.validatorDescriptors).toEqual([
            {kind: 'required', message: 'Name required'},
            {kind: 'minLength', value: 2, message: 'Name too short'}
        ]);
    });

    it('adds generic validation for builder metadata when Zod is registered', () => {
        registerZodValidator({name: 'zod-angular-reactive-builder'});
        const user = model('SignupDtoZodReactive', {
            name: stringField().required().minLength(2, 'Name too short'),
            email: stringField().required().email('Invalid email'),
            age: numberField().min(18, 'Too young').optional()
        });

        const config = toReactiveFormConfig(user);

        expect(config.fields[0]?.validators.every((validator) => typeof validator === 'function')).toBe(true);
        expect(config.validate?.({name: 'A', email: 'bad'})).toMatchObject({success: false});
    });
    it('enforces unsupported sync constraints through a Decorix-backed ValidatorFn', () => {
        const metadata = model('ReactiveFallbackDto', {
            slug: stringField().required().slug('Invalid slug')
        });

        const config = toReactiveFormConfig(metadata);
        const slug = config.fields[0];

        expect(runValidators(slug?.validators ?? [], 'Bad Slug')).toEqual([
            {slug: {message: 'Invalid slug'}}
        ]);
        expect(runValidators(slug?.validators ?? [], 'good-slug')).toEqual([]);
    });
});

