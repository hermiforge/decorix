import {model, stringField} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {useFormKitDecorix} from '@decorix/vue-formkit';

registerZodValidator();

const ProfileDto = model('ProfileDto', {
    name: stringField().required('Name is required').minLength(2, 'Name is too short').label('Display name')
});

const config = useFormKitDecorix(ProfileDto, {initialValues: {name: 'Ada'}});

console.log(config.schema[0]?.validation, config.validate?.({name: 'Ada'}).success);
