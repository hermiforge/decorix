// Needed only because this script runs outside an Angular CLI build (which performs its own AOT
// linking); real Angular apps built with `ng build`/`@angular/build` never need this import.
import '@angular/compiler';
import {model, numberField, stringField} from '@hermiforge-decorix/core';
import {toSignalForm} from '@hermiforge-decorix/angular-signal';

const RegisterUserDto = model('RegisterUserDto', {
    fullName: stringField().required('Name is required').minLength(2, 'Name is too short').maxLength(50),
    email: stringField().required('Email is required').email('Invalid email'),
    age: numberField().min(18, 'You must be an adult').optional(),
    password: stringField().required('Password is required').minLength(8, 'Password must be at least 8 characters'),
    confirmPassword: stringField().required('Please confirm your password').equalsField('password', 'Passwords must match')
});

type RegisterUserModel = {fullName: string; email: string; age?: number; password: string; confirmPassword: string};

/**
 * `toSignalForm` calls Angular's real `form()`, which needs an Angular injection context — this
 * module only exports a factory; call it from inside a bootstrapped Angular application.
 */
export function createRegisterForm() {
    return toSignalForm<RegisterUserModel>(RegisterUserDto, {
        initialValue: {fullName: 'A', email: 'not-an-email', age: 12, password: 'short', confirmPassword: 'different'}
    });
}

console.log('createRegisterForm() builds a real Angular Signal Forms FieldTree — call it from a component field initializer.');
