import type {ConstraintMetadata, FieldMetadata} from './types';

/**
 * Adds or replaces a constraint by kind on the supplied field-like object.
 *
 * @param field - Metadata object carrying constraints.
 * @param constraint - Constraint to add or replace.
 */
export function upsertConstraintMetadata(
    field: Pick<FieldMetadata, 'constraints'>,
    constraint: ConstraintMetadata
): void {
    const index = field.constraints.findIndex((current) => current.kind === constraint.kind);
    if (index >= 0) {
        field.constraints[index] = constraint;
        return;
    }

    field.constraints.push(constraint);
}
