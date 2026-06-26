import {MinLength, Model, Required} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toReactHookForm} from '@decorix/react-hook-form';

registerZodValidator();

@Model('ProfileDto')
class ProfileDto {
    @Required('Name is required')
    @MinLength(2, 'Name is too short')
    name!: string;
}

const config = toReactHookForm(ProfileDto, {defaultValues: {name: 'Ada'}});

config.resolver({name: 'Ada'}).then((result) => console.log(result.errors));
