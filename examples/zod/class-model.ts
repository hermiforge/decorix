import {EqualsField, Email, MaxLength, Min, MinLength, Model, Optional, Required} from '@decorix/core';
import {registerZodValidator, toZod} from '@decorix/zod';

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

const schema = toZod(RegisterUserDto);

const valid = schema.safeParse({name: 'Ada', email: 'ada@example.com', age: 37, password: 'correct-horse', confirmPassword: 'correct-horse'});
console.log('valid payload:', valid.success);

const invalid = schema.safeParse({name: 'A', email: 'not-an-email', age: 12, password: 'short', confirmPassword: 'different'});
console.log('invalid payload:', invalid.success);
if (!invalid.success) {
    for (const issue of invalid.error.issues) {
        console.log(`  ${issue.path.join('.')}: ${issue.message}`);
    }
}
