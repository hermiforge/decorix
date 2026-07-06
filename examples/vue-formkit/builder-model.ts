import {model, numberField, stringField} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {useFormKitDecorix} from '@decorix/vue-formkit';

registerZodValidator();

const RegisterUserDto = model('RegisterUserDto', {
    name: stringField().required('Name is required').minLength(2, 'Name is too short').maxLength(50).label('Name'),
    email: stringField().required('Email is required').email('Invalid email').label('Email'),
    age: numberField().min(18, 'You must be an adult').optional().label('Age'),
    password: stringField().required('Password is required').minLength(8, 'Password must be at least 8 characters'),
    confirmPassword: stringField().required('Please confirm your password').equalsField('password', 'Passwords must match')
});

const config = useFormKitDecorix(RegisterUserDto, {
    initialValues: {name: 'Ada', email: 'ada@example.com', age: 37, password: 'correct-horse', confirmPassword: 'correct-horse'}
});

console.log('valid payload:', config.validate?.({name: 'Ada', email: 'ada@example.com', age: 37, password: 'correct-horse', confirmPassword: 'correct-horse'}).success);

const invalid = config.validate?.({name: 'A', email: 'not-an-email', age: 12, password: 'short', confirmPassword: 'different'});
console.log('invalid payload:', invalid?.success);
