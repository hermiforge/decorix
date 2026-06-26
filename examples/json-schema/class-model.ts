import {Label, MinLength, Model, Required} from '@decorix/core';
import {toJsonSchema} from '@decorix/json-schema';

@Model('ProfileDto')
class ProfileDto {
    @Required('Name is required')
    @MinLength(2, 'Name is too short')
    @Label('Display name')
    name!: string;
}

const schema = toJsonSchema(ProfileDto);

console.log(schema.properties?.name?.title);
