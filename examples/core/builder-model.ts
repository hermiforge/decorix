import {model, stringField} from '@decorix/core';

const ProfileDto = model('ProfileDto', {
    name: stringField().required('Name is required').minLength(2, 'Name is too short')
});

console.log(ProfileDto.fields.map((field) => field.name));
