import {EqualsField, Email, MaxLength, Min, MinLength, Model, Optional, Required} from '@hermiforge-decorix/core';
import {registerZodValidator} from '@hermiforge-decorix/zod';
import {toSignalForm} from '@hermiforge-decorix/angular-signal';

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

const form = toSignalForm(RegisterUserDto, {
    initialValue: {name: 'Ada', email: 'ada@example.com', age: 37, password: 'correct-horse', confirmPassword: 'correct-horse'}
});
console.log('valid form submit:', form.submit());

const invalidForm = toSignalForm(RegisterUserDto, {
    initialValue: {name: 'A', email: 'not-an-email', age: 12, password: 'short', confirmPassword: 'different'}
});
const result = invalidForm.submit();
console.log('invalid form submit success:', result.success);
if (!result.success) {
    console.log('errors by field:', result.errors);
    console.log('name field errors:', invalidForm.name.errors());
}
