import {model, numberField, stringField} from '@decorix/core';
import {toZod} from '@decorix/zod';

const RegisterUserDto = model('RegisterUserDto', {
    name: stringField().required('Name is required').minLength(2).maxLength(50).label('Name'),
    email: stringField().required('Email is required').email('Invalid email').label('Email'),
    age: numberField().min(18, 'You must be an adult').optional()
});

const schema = toZod(RegisterUserDto);

console.log(schema.safeParse({name: 'Ada', email: 'ada@example.com', age: 37}).success);
