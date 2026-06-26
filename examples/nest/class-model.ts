import {MinLength, Model, Required} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {DecorixPipe} from '@decorix/nest';

registerZodValidator();

@Model('ProfileDto')
class ProfileDto {
    @Required('Name is required')
    @MinLength(2, 'Name is too short')
    name!: string;
}

const pipe = DecorixPipe(ProfileDto);

console.log(pipe.transform({name: 'Ada'}));
