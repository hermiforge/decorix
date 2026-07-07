import {EqualsField, Email, MaxLength, Min, MinLength, Model, Optional, Required} from '@hermiforge-decorix/core';
import {registerZodValidator} from '@hermiforge-decorix/zod';
import {createSuperformsValidatorAdapter} from '@hermiforge-decorix/svelte-superforms';

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

// This example calls the adapter's own `validate` directly (the same
// function `sveltekit-superforms`'s `superValidate(data, adapter)` would
// call) rather than importing `sveltekit-superforms/server`, since that
// package is a peer dependency of the adapter package, not of these
// examples — see the package README for a full `superValidate`/`superForm`
// walkthrough.
const adapter = createSuperformsValidatorAdapter(RegisterUserDto, {
    initialValues: {name: 'Ada', email: 'ada@example.com', age: 37, password: 'correct-horse', confirmPassword: 'correct-horse'}
});

const valid = await adapter.validate({name: 'Ada', email: 'ada@example.com', age: 37, password: 'correct-horse', confirmPassword: 'correct-horse'});
console.log('valid payload:', valid.success);

const invalid = await adapter.validate({name: 'A', email: 'not-an-email', age: 12, password: 'short', confirmPassword: 'different'});
console.log('invalid payload:', invalid.success);
if (!invalid.success) console.log('issues:', invalid.issues);
