import {model, numberField, stringField} from '@decorix/core';
import {createZodValidatorAdapter, toZod} from '@decorix/zod';

const RegisterUserDto = model('RegisterUserDto', {
    name: stringField().required('Name is required').minLength(2, 'Name is too short').maxLength(50),
    email: stringField().required('Email is required').email('Invalid email'),
    age: numberField().min(18, 'You must be an adult').optional(),
    password: stringField().required('Password is required').minLength(8, 'Password must be at least 8 characters'),
    confirmPassword: stringField().required('Please confirm your password').equalsField('password', 'Passwords must match')
});

const schema = toZod(RegisterUserDto);
const validator = createZodValidatorAdapter().createSchema(RegisterUserDto);

const valid = {name: 'Ada', email: 'ada@example.com', age: 37, password: 'correct-horse', confirmPassword: 'correct-horse'};
const invalid = {name: 'A', email: 'not-an-email', age: 12, password: 'short', confirmPassword: 'different'};

console.log('valid payload:', schema.safeParse(valid).success, validator.validate(valid).success);

const result = validator.validate(invalid);
console.log('invalid payload:', result.success);
if (!result.success) {
    for (const issue of result.issues) {
        console.log(`  ${issue.path.join('.')}: ${issue.message} (${issue.constraint})`);
    }
}
