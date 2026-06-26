import {MinLength, Model, Required} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toTanStackForm} from '@decorix/react-tanstack-form';

registerZodValidator();

@Model('ProfileDto')
class ProfileDto {
    @Required('Name is required')
    @MinLength(2, 'Name is too short')
    name!: string;
}

const config = toTanStackForm(ProfileDto, {defaultValues: {name: 'Ada'}});

console.log(config.validators.onSubmit({name: 'Ada'}));
