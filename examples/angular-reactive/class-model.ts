import {EqualsField, Email, MaxLength, Min, MinLength, Model, Optional, Required} from '@hermiforge-decorix/core';
import {registerZodValidator} from '@hermiforge-decorix/zod';
import {toReactiveFormConfig} from '@hermiforge-decorix/angular-reactive';

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

// Cross-field constraints (EqualsField) mean this model needs a core-backed
// schema for form-level validation; `config.validate` is present automatically.
const config = toReactiveFormConfig(RegisterUserDto, {
    initialValue: {name: 'Ada', email: 'ada@example.com', age: 37, password: 'correct-horse', confirmPassword: 'correct-horse'}
});
const descriptorConfig = toReactiveFormConfig(RegisterUserDto, {validationMode: 'descriptors'});

console.log('native ValidatorFn:', typeof config.fields[0]?.validators[0]);
console.log('framework-neutral descriptors:', descriptorConfig.fields.map((field) => field.validators.map((validator) => validator.kind)));

console.log('valid payload:', config.validate?.({name: 'Ada', email: 'ada@example.com', age: 37, password: 'correct-horse', confirmPassword: 'correct-horse'}).success);

const invalid = config.validate?.({name: 'A', email: 'not-an-email', age: 12, password: 'short', confirmPassword: 'different'});
console.log('invalid payload:', invalid?.success);
if (invalid && !invalid.success) {
    for (const issue of invalid.issues) {
        console.log(`  ${issue.path.join('.')}: ${issue.message}`);
    }
}
