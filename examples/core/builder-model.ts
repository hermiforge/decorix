import {model, numberField, stringField, validate} from '@hermiforge-decorix/core';

const RegisterUserDto = model('RegisterUserDto', {
    name: stringField().required('Name is required').minLength(2, 'Name is too short').maxLength(50),
    email: stringField().required('Email is required').email('Invalid email'),
    age: numberField().min(18, 'You must be an adult').optional(),
    password: stringField().required('Password is required').minLength(8, 'Password must be at least 8 characters'),
    confirmPassword: stringField().required('Please confirm your password').equalsField('password', 'Passwords must match')
});

// `validate` runs Decorix's own constraint engine directly — no Zod (or any
// other) validator adapter required.
const valid = validate(
    {name: 'Ada', email: 'ada@example.com', age: 37, password: 'correct-horse', confirmPassword: 'correct-horse'},
    RegisterUserDto
);
console.log('valid payload:', valid.success);

const invalid = validate(
    {name: 'A', email: 'not-an-email', age: 12, password: 'short', confirmPassword: 'different'},
    RegisterUserDto
);
console.log('invalid payload:', invalid.success);
if (!invalid.success) {
    for (const issue of invalid.issues) {
        console.log(`  ${issue.path.join('.')}: ${issue.message} (${issue.constraint})`);
    }
}
