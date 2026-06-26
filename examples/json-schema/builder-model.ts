import {model, stringField} from '@decorix/core';
import {toJsonSchema} from '@decorix/json-schema';

const ProfileDto = model('ProfileDto', {
    name: stringField().required('Name is required').minLength(2, 'Name is too short').label('Display name')
});

const schema = toJsonSchema(ProfileDto);

console.log(schema.required);
