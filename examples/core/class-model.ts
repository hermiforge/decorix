import {getModelMetadata, MinLength, Model, Required} from '@decorix/core';

@Model('ProfileDto')
class ProfileDto {
    @Required('Name is required')
    @MinLength(2, 'Name is too short')
    name!: string;
}

const metadata = getModelMetadata(ProfileDto);

console.log(metadata.fields.map((field) => field.name));
