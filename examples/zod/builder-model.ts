import {model, stringField} from '@decorix/core';
import {createZodValidatorAdapter, toZod} from '@decorix/zod';

const ProfileDto = model('ProfileDto', {
    name: stringField().required('Name is required').minLength(2, 'Name is too short')
});

const schema = toZod(ProfileDto);
const validator = createZodValidatorAdapter().createSchema(ProfileDto);

console.log(schema.safeParse({name: 'Ada'}).success, validator.validate({name: 'Ada'}).success);
