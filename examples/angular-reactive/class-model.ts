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
const descriptorConfig = toReactiveFormConfig(ProfileDto, {validationMode: 'descriptors'});

console.log(typeof config.fields[0]?.validators[0], descriptorConfig.fields[0]?.validators);
console.log(config.validate?.({name: 'Ada'}).success);
