import {model, stringField} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {DecorixPipe} from '@decorix/nest';

registerZodValidator();

const ProfileDto = model('ProfileDto', {
    name: stringField().required('Name is required').minLength(2, 'Name is too short')
});

const pipe = DecorixPipe(ProfileDto);

console.log(pipe.transform({name: 'Ada'}));
