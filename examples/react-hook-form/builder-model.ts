import {model, stringField} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {useReactHookDecorix} from '@decorix/react-hook-form';

registerZodValidator();

const ProfileDto = model('ProfileDto', {
    name: stringField().required('Name is required').minLength(2, 'Name is too short')
});

const config = useReactHookDecorix(ProfileDto, {defaultValues: {name: 'Ada'}});

console.log(config.fields);
