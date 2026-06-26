import {model, stringField} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {useTanStackDecorix} from '@decorix/react-tanstack-form';

registerZodValidator();

const ProfileDto = model('ProfileDto', {
    name: stringField().required('Name is required').minLength(2, 'Name is too short')
});

const config = useTanStackDecorix(ProfileDto, {defaultValues: {name: 'Ada'}});

console.log(config.defaultValues);
