import {model, numberField, stringField} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toSignalForm} from '@decorix/angular-signal';

registerZodValidator();

const RegisterUserDto = model('RegisterUserDto', {
    name: stringField().required('Name is required').minLength(2, 'Name is too short').maxLength(50),
    email: stringField().required('Email is required').email('Invalid email'),
    age: numberField().min(18, 'You must be an adult').optional(),
    password: stringField().required('Password is required').minLength(8, 'Password must be at least 8 characters'),
    confirmPassword: stringField().required('Please confirm your password').equalsField('password', 'Passwords must match')
});

const invalidForm = toSignalForm(RegisterUserDto, {
    initialValue: {name: 'A', email: 'not-an-email', age: 12, password: 'short', confirmPassword: 'different'}
});

console.log('valid:', invalidForm.valid());
console.log('errors by field:', invalidForm.errors());
