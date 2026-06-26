import {Label, MinLength, Model, Required} from '@decorix/core';
import {toFormKit} from '@decorix/vue-formkit';

@Model('ProfileDto')
class ProfileDto {
    @Required('Name is required')
    @MinLength(2, 'Name is too short')
    @Label('Display name')
    name!: string;
}

const config = toFormKit(ProfileDto, {initialValues: {name: 'Ada'}});

console.log(config.schema[0]);
