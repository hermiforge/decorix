import {MinLength, Model, Required} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toReactiveFormConfig} from '@decorix/angular-reactive';

registerZodValidator();

@Model('ProfileDto')
class ProfileDto {
    @Required('Name is required')
    @MinLength(2, 'Name is too short')
    name!: string;
}

const config = toReactiveFormConfig(ProfileDto, {initialValue: {name: 'Ada'}});

console.log(config.fields, config.validate?.({name: 'Ada'}).success);
