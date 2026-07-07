// Needed only because this script runs outside an Angular CLI build (which performs its own AOT
// linking); real Angular apps built with `ng build`/`@angular/build` never need this import.
import '@angular/compiler';
import {EqualsField, Email, MaxLength, Min, MinLength, Model, Optional, Required} from '@hermiforge-decorix/core';
import {toSignalForm} from '@hermiforge-decorix/angular-signal';

// `fullName`, not `name`: a model field literally named `name` collides with FieldTree's own
// `Function.prototype.name` at the type level (Angular's own Signal Forms docs avoid it the same way).
@Model('RegisterUserDto')
class RegisterUserDto {
    @Required('Name is required')
    @MinLength(2, 'Name is too short')
    @MaxLength(50)
    fullName!: string;

    @Required('Email is required')
    @Email('Invalid email')
    email!: string;

    @Optional()
    @Min(18, 'You must be an adult')
    age?: number;

    @Required('Password is required')
    @MinLength(8, 'Password must be at least 8 characters')
    password!: string;

    @Required('Please confirm your password')
    @EqualsField('password', 'Passwords must match')
    confirmPassword!: string;
}

/**
 * `toSignalForm` calls Angular's real `form()`, which needs an Angular injection context
 * (a component/service field initializer always is one). This module only exports a factory
 * — it cannot execute standalone via `tsx` the way Decorix's other examples do; call it from
 * inside a bootstrapped Angular application (see this adapter's README for a component example).
 *
 * No separate `RegisterUserModel` type or explicit `toSignalForm<RegisterUserModel>(...)` is
 * needed here: `TModel` is inferred straight from `RegisterUserDto`.
 */
export function createRegisterForm() {
    return toSignalForm(RegisterUserDto, {
        initialValue: {fullName: 'Ada', email: 'ada@example.com', age: 37, password: 'correct-horse', confirmPassword: 'correct-horse'}
    });
}

console.log('createRegisterForm() builds a real Angular Signal Forms FieldTree — call it from a component field initializer.');
