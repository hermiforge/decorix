import {model, stringField} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toSignalForm} from '@decorix/angular-signal';

registerZodValidator();

const ProfileDto = model('ProfileDto', {
    name: stringField().required('Name is required').minLength(2, 'Name is too short')
});

const form = toSignalForm(ProfileDto, {initialValue: {name: 'Ada'}});

console.log(form.submit());
