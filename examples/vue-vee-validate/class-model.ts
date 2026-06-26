import {MinLength, Model, Required} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toVeeValidate} from '@decorix/vue-vee-validate';

registerZodValidator();

@Model('ProfileDto')
class ProfileDto {
    @Required('Name is required')
    @MinLength(2, 'Name is too short')
    name!: string;
}

const config = toVeeValidate(ProfileDto, {initialValues: {name: 'Ada'}});

console.log(config.validate({name: 'Ada'}).success);
