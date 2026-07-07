import {model, numberField, stringField} from '@hermiforge-decorix/core';
import {registerZodValidator} from '@hermiforge-decorix/zod';
import {createSuperformsValidatorAdapter} from '@hermiforge-decorix/svelte-superforms';

registerZodValidator();

const RegisterUserDto = model('RegisterUserDto', {
    name: stringField().required('Name is required').minLength(2, 'Name is too short').maxLength(50),
    email: stringField().required('Email is required').email('Invalid email'),
    age: numberField().min(18, 'You must be an adult').optional(),
    password: stringField().required('Password is required').minLength(8, 'Password must be at least 8 characters'),
    confirmPassword: stringField().required('Please confirm your password').equalsField('password', 'Passwords must match')
});

const adapter = createSuperformsValidatorAdapter(RegisterUserDto, {
    initialValues: {name: 'Ada', email: 'ada@example.com', age: 37, password: 'correct-horse', confirmPassword: 'correct-horse'}
});

const valid = await adapter.validate({name: 'Ada', email: 'ada@example.com', age: 37, password: 'correct-horse', confirmPassword: 'correct-horse'});
console.log('valid payload:', valid.success);

const invalid = await adapter.validate({name: 'A', email: 'not-an-email', age: 12, password: 'short', confirmPassword: 'different'});
console.log('invalid payload:', invalid.success);
