import {MinLength, Model, Required} from '@decorix/core';
import {registerZodValidator, toZod} from '@decorix/zod';

registerZodValidator();

@Model('ProfileDto')
class ProfileDto {
    @Required('Name is required')
    @MinLength(2, 'Name is too short')
    name!: string;
}

const schema = toZod(ProfileDto);

console.log(schema.safeParse({name: 'Ada'}).success);
