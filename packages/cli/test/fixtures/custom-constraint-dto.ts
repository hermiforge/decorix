import {Constraint, Model, model, Required, stringField} from '@hermiforge-decorix/core';

/**
 * Fixtures carrying a custom named constraint in both authoring modes. The CLI
 * does not run validation, but `scan` must surface the constraint name from the
 * discovered metadata — proving custom constraints survive discovery/rendering.
 */
@Model('CliCustomClassDto')
export class CliCustomClassDto {
    @Required()
    @Constraint('startsWithA')
    code!: string;
}

export const CliCustomBuilderDto = model('CliCustomBuilderDto', {
    code: stringField().required().constraint('startsWithA')
});
