import {EqualsField, Email, Label, MaxLength, Min, MinLength, Model, Optional, Required, validate} from '@hermiforge-decorix/core';
import {toJsonSchema} from '@hermiforge-decorix/json-schema';

@Model('RegisterUserDto')
class RegisterUserDto {
    @Required('Name is required')
    @MinLength(2, 'Name is too short')
    @MaxLength(50)
    @Label('Name')
    name!: string;

    @Required('Email is required')
    @Email('Invalid email')
    @Label('Email')
    email!: string;

    @Optional()
    @Min(18, 'You must be an adult')
    @Label('Age')
    age?: number;

    @Required('Password is required')
    @MinLength(8, 'Password must be at least 8 characters')
    password!: string;

    @Required('Please confirm your password')
    @EqualsField('password', 'Passwords must match')
    confirmPassword!: string;
}

const schema = toJsonSchema(RegisterUserDto);

console.log('required properties:', schema.required);
console.log('email format:', schema.properties?.email?.format);
console.log('name title:', schema.properties?.name?.title);

// JSON Schema export/import round-trips shape, but Decorix validation itself
// still goes through `validate` (or an adapter) — the schema alone doesn't validate.
const invalid = validate(
    {name: 'A', email: 'not-an-email', age: 12, password: 'short', confirmPassword: 'different'},
    RegisterUserDto
);
console.log('invalid payload:', invalid.success);
if (!invalid.success) {
    for (const issue of invalid.issues) {
        console.log(`  ${issue.path.join('.')}: ${issue.message}`);
    }
}
