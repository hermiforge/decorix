import {model, numberField, stringField} from '@decorix/core';
import {toZod} from '@decorix/zod';

const RegisterUserDto = model('RegisterUserDto', {
    name: stringField().required('Name is required').minLength(2).maxLength(50).label('Name'),
    email: stringField().required('Email is required').email('Invalid email').label('Email'),
    age: numberField().min(18, 'You must be an adult').optional()
});

const schema = toZod(RegisterUserDto);

console.log('valid payload:', schema.safeParse({name: 'Ada', email: 'ada@example.com', age: 37}).success);

const invalid = schema.safeParse({name: 'A', email: 'not-an-email', age: 12});
console.log('invalid payload:', invalid.success);
if (!invalid.success) {
    for (const issue of invalid.error.issues) {
        console.log(`  ${issue.path.join('.')}: ${issue.message}`);
    }
}
