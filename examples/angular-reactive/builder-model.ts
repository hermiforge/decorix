import {model, stringField} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toReactiveFormConfig} from '@decorix/angular-reactive';

registerZodValidator();

const ProfileDto = model('ProfileDto', {
    name: stringField().required('Name is required').minLength(2, 'Name is too short')
});

const config = toReactiveFormConfig(ProfileDto, {initialValue: {name: 'Ada'}});

console.log(config.fields[0]?.validators);
