import {MinLength, Model, Required} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toSignalForm} from '@decorix/angular-signal';

registerZodValidator();

@Model('ProfileDto')
class ProfileDto {
    @Required('Name is required')
    @MinLength(2, 'Name is too short')
    name!: string;
}

const form = toSignalForm(ProfileDto, {initialValue: {name: 'Ada'}});

console.log(form.valid(), form.value());
