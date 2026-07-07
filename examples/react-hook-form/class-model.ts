import {EqualsField, Email, MaxLength, Min, MinLength, Model, Optional, Required} from '@hermiforge-decorix/core';
import {registerZodValidator} from '@hermiforge-decorix/zod';
import {toReactHookForm} from '@hermiforge-decorix/react-hook-form';

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

const config = toReactHookForm(RegisterUserDto, {
    defaultValues: {name: 'Ada', email: 'ada@example.com', age: 37, password: 'correct-horse', confirmPassword: 'correct-horse'}
});

const valid = await config.resolver({name: 'Ada', email: 'ada@example.com', age: 37, password: 'correct-horse', confirmPassword: 'correct-horse'});
console.log('valid payload errors:', valid.errors);

const invalid = await config.resolver({name: 'A', email: 'not-an-email', age: 12, password: 'short', confirmPassword: 'different'});
console.log('invalid payload errors:', invalid.errors);

// `T` is inferred straight from `RegisterUserDto` — no separate `RegisterUserFormValues`
// type or `as` cast needed for `defaultValues`/`resolver` (or for `useForm<RegisterUserDto>`
// in a real React app).
const typedDefaults: Partial<RegisterUserDto> = config.defaultValues;
const typedValues: RegisterUserDto = valid.values;
console.log('typed without a cast:', typedDefaults.name, typedValues.email);
