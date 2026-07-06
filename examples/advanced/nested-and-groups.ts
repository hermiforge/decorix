import {arrayField, MinLength, Model, Required, model, numberField, objectField, stringField, validate} from '@hermiforge-decorix/core';

// Nested objects and arrays of objects validate recursively; issue paths
// include the full path down to the failing field (e.g. `addresses.0.city`).
@Model('AddressDto')
class AddressDto {
    @Required()
    city!: string;

    @Required()
    @MinLength(2)
    postalCode!: string;
}

const OrderDto = model('OrderDto', {
    billingAddress: objectField({
        city: stringField().required(),
        postalCode: stringField().required().minLength(2)
    }),
    items: arrayField(
        objectField({
            sku: stringField().required(),
            quantity: numberField().required().min(1, 'Quantity must be at least 1')
        })
    ).minItems(1, 'Add at least one item')
});

const invalidOrder = validate(
    {
        billingAddress: {city: 'Springfield', postalCode: ''},
        items: [{sku: 'WIDGET', quantity: 0}, {sku: 'GADGET', quantity: 2}]
    },
    OrderDto
);
console.log('nested/array validation success:', invalidOrder.success);
if (!invalidOrder.success) {
    for (const issue of invalidOrder.issues) console.log(`  ${issue.path.join('.')}: ${issue.message}`);
}

// Decorator-declared nested class model, for symmetry with the builder form above.
console.log('decorator model valid:', validate({city: 'Springfield', postalCode: '62704'}, AddressDto).success);

// Validation groups: a constraint with `groups` only runs when `validate(..., {group})`
// requests that group; ungrouped constraints always run.
@Model('ProfileUpdateDto')
class ProfileUpdateDto {
    @Required()
    displayName!: string;

    @Required({groups: ['strict']})
    @MinLength(12, {message: 'Password must be at least 12 characters', groups: ['strict']})
    password!: string;
}

const payload = {displayName: 'Ada', password: 'short'};
console.log('default group (password constraints skipped):', validate(payload, ProfileUpdateDto).success);
console.log('strict group (password constraints enforced):', validate(payload, ProfileUpdateDto, {group: 'strict'}).success);
