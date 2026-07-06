import {model, numberField, stringField} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {useReactHookDecorix} from '@decorix/react-hook-form';

registerZodValidator();

const RegisterUserDto = model('RegisterUserDto', {
    name: stringField().required('Name is required').minLength(2, 'Name is too short').maxLength(50),
    email: stringField().required('Email is required').email('Invalid email'),
    age: numberField().min(18, 'You must be an adult').optional(),
    password: stringField().required('Password is required').minLength(8, 'Password must be at least 8 characters'),
    confirmPassword: stringField().required('Please confirm your password').equalsField('password', 'Passwords must match')
});

const config = useReactHookDecorix(RegisterUserDto, {
    defaultValues: {name: 'Ada', email: 'ada@example.com', age: 37, password: 'correct-horse', confirmPassword: 'correct-horse'}
});

console.log('fields:', config.fields.map((field) => field.name));

const invalid = await config.resolver({name: 'A', email: 'not-an-email', age: 12, password: 'short', confirmPassword: 'different'});
console.log('invalid payload errors:', invalid.errors);
