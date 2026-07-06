import {model, numberField, stringField} from '@hermiforge-decorix/core';
import {registerZodValidator} from '@hermiforge-decorix/zod';
import {useTanStackDecorix} from '@hermiforge-decorix/react-tanstack-form';

registerZodValidator();

const RegisterUserDto = model('RegisterUserDto', {
    name: stringField().required('Name is required').minLength(2, 'Name is too short').maxLength(50),
    email: stringField().required('Email is required').email('Invalid email'),
    age: numberField().min(18, 'You must be an adult').optional(),
    password: stringField().required('Password is required').minLength(8, 'Password must be at least 8 characters'),
    confirmPassword: stringField().required('Please confirm your password').equalsField('password', 'Passwords must match')
});

const config = useTanStackDecorix(RegisterUserDto, {
    defaultValues: {name: 'Ada', email: 'ada@example.com', age: 37, password: 'correct-horse', confirmPassword: 'correct-horse'}
});

console.log('default values:', config.defaultValues);
console.log('invalid payload:', config.validators.onSubmit({name: 'A', email: 'not-an-email', age: 12, password: 'short', confirmPassword: 'different'}));
