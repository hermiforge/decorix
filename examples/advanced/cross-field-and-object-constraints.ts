import {EqualsField, Model, ObjectConstraint, Optional, Required, model, objectConstraint, stringField, validate} from '@decorix/core';

// Cross-field constraints compare a field against another root-level field by dot-path.
// `RequiredIf`/`ForbiddenIf` (not shown here) work the same way with a predicate instead of a path.
@Model('PasswordResetDto')
@ObjectConstraint<{newPassword?: string; currentPassword?: string}>({
    // Object-level constraints validate the whole object; `path` controls where the issue is reported.
    validator: (object) => object.newPassword !== object.currentPassword,
    message: 'New password must differ from the current password.',
    path: ['newPassword']
})
class PasswordResetDto {
    @Required()
    currentPassword!: string;

    @Required()
    newPassword!: string;

    @Required()
    @EqualsField('newPassword', 'Passwords must match')
    confirmPassword!: string;

    @Optional()
    reason?: string;
}

const sameAsCurrentResult = validate(
    {currentPassword: 'correct-horse', newPassword: 'correct-horse', confirmPassword: 'correct-horse'},
    PasswordResetDto
);
console.log('reusing current password:', sameAsCurrentResult.success);
if (!sameAsCurrentResult.success) {
    for (const issue of sameAsCurrentResult.issues) console.log(`  ${issue.path.join('.')}: ${issue.message}`);
}

const mismatchResult = validate(
    {currentPassword: 'correct-horse', newPassword: 'battery-staple', confirmPassword: 'different'},
    PasswordResetDto
);
console.log('mismatched confirmation:', mismatchResult.success);
if (!mismatchResult.success) {
    for (const issue of mismatchResult.issues) console.log(`  ${issue.path.join('.')}: ${issue.message}`);
}

// Named, reusable object constraint via the builder: register the validator
// once with `objectConstraint(name, definition)`, then reference it by name on
// any model (mirrors `defineConstraint` for field-level rules).
const passwordsDiffer = objectConstraint<{newPassword?: string; currentPassword?: string}, undefined>('passwordsDiffer', {
    validate: (object) => object.newPassword !== object.currentPassword,
    message: 'New password must differ from the current password.'
});

const PasswordResetBuilderDto = model(
    'PasswordResetBuilderDto',
    {
        currentPassword: stringField().required(),
        newPassword: stringField().required(),
        confirmPassword: stringField().required().equalsField('newPassword', 'Passwords must match')
    },
    [passwordsDiffer]
);

console.log('builder model, valid:', validate(
    {currentPassword: 'correct-horse', newPassword: 'battery-staple', confirmPassword: 'battery-staple'},
    PasswordResetBuilderDto
).success);
