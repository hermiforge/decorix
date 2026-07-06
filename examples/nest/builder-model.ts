import {model, numberField, stringField} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {DecorixPipe, DecorixValidationException} from '@decorix/nest';

registerZodValidator();

const RegisterUserDto = model('RegisterUserDto', {
    name: stringField().required('Name is required').minLength(2, 'Name is too short').maxLength(50),
    email: stringField().required('Email is required').email('Invalid email'),
    age: numberField().min(18, 'You must be an adult').optional(),
    password: stringField().required('Password is required').minLength(8, 'Password must be at least 8 characters'),
    confirmPassword: stringField().required('Please confirm your password').equalsField('password', 'Passwords must match')
});

const pipe = DecorixPipe(RegisterUserDto);

console.log('valid payload:', await pipe.transform({name: 'Ada', email: 'ada@example.com', age: 37, password: 'correct-horse', confirmPassword: 'correct-horse'}));

try {
    await pipe.transform({name: 'A', email: 'not-an-email', age: 12, password: 'short', confirmPassword: 'different'});
} catch (error) {
    if (error instanceof DecorixValidationException) {
        console.log('invalid payload errors:', error.response.issues);
    }
}
