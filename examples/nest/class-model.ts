import {EqualsField, Email, MaxLength, Min, MinLength, Model, Optional, Required} from '@hermiforge-decorix/core';
import {registerZodValidator} from '@hermiforge-decorix/zod';
import {DecorixPipe, DecorixValidationException} from '@hermiforge-decorix/nest';

registerZodValidator();

@Model('RegisterUserDto')
class RegisterUserDto {
    @Required('Name is required')
    @MinLength(2, 'Name is too short')
    @MaxLength(50)
    name!: string;

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

const pipe = DecorixPipe(RegisterUserDto);

console.log('valid payload:', await pipe.transform({name: 'Ada', email: 'ada@example.com', age: 37, password: 'correct-horse', confirmPassword: 'correct-horse'}));

try {
    await pipe.transform({name: 'A', email: 'not-an-email', age: 12, password: 'short', confirmPassword: 'different'});
} catch (error) {
    // DecorixPipe throws DecorixValidationException (a Nest-friendly shape) on invalid input.
    if (error instanceof DecorixValidationException) {
        console.log('invalid payload errors:', error.response.issues);
    }
}
