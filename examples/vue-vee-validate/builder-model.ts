import {model, stringField} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {useVeeDecorix} from '@decorix/vue-vee-validate';

registerZodValidator();

const ProfileDto = model('ProfileDto', {
    name: stringField().required('Name is required').minLength(2, 'Name is too short')
});

const config = useVeeDecorix(ProfileDto, {initialValues: {name: 'Ada'}});

console.log(config.fields.map((field) => field.name));
