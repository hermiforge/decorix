import {Email, Label, MaxLength, Min, MinLength, Model, Required} from '@hermiforge-decorix/core';

/**
 * Decorator-based DTO fixture. Exported so the CLI loader can discover it, and
 * authored with legacy Decorix decorators so it exercises the `experimentalDecorators`
 * emit path in `loadEntry` (the path that previously crashed).
 */
@Model('CliUserDto')
export class CliUserDto {
    @Required('Name is required')
    @MinLength(2, 'Name is too short')
    @MaxLength(50)
    @Label('Name')
    name!: string;

    @Required('Email is required')
    @Email('Invalid email')
    email!: string;

    @Min(18, 'You must be an adult')
    age?: number;
}
