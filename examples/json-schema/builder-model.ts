import {model, numberField, stringField, validate} from '@decorix/core';
import {fromJsonSchema, toJsonSchema} from '@decorix/json-schema';

const RegisterUserDto = model('RegisterUserDto', {
    name: stringField().required('Name is required').minLength(2, 'Name is too short').maxLength(50).label('Name'),
    email: stringField().required('Email is required').email('Invalid email').label('Email'),
    age: numberField().min(18, 'You must be an adult').optional().label('Age'),
    password: stringField().required('Password is required').minLength(8, 'Password must be at least 8 characters'),
    confirmPassword: stringField().required('Please confirm your password').equalsField('password', 'Passwords must match')
});

const schema = toJsonSchema(RegisterUserDto);
console.log('required properties:', schema.required);

// Round-trip: a Decorix-produced schema converts back to metadata that
// re-exports to the same shape (custom validator/predicate functions aside).
const roundTripped = fromJsonSchema(schema);
const roundTrippedSchema = toJsonSchema(roundTripped);
console.log('round-trip stable:', JSON.stringify(schema) === JSON.stringify(roundTrippedSchema));

const invalid = validate(
    {name: 'A', email: 'not-an-email', age: 12, password: 'short', confirmPassword: 'different'},
    RegisterUserDto
);
console.log('invalid payload:', invalid.success);
