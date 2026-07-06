import {
    Constraint,
    createAsyncConstraint,
    defineAsyncConstraint,
    defineConstraint,
    Model,
    Required,
    model,
    stringField,
    validate,
    validateAsync
} from '@decorix/core';

// `defineConstraint` registers a constraint once and returns a callable
// `ReusableConstraint`: use it directly as a decorator (`@StartsWithA()`) or
// pass it by reference to the builder (`.constraint(StartsWithA)`).
const StartsWithA = defineConstraint<string, undefined>({
    name: 'startsWithA',
    validate: (value) => typeof value === 'string' && value.startsWith('A'),
    message: 'Value must start with "A".'
});

// `defineAsyncConstraint` is the async counterpart, resolved by `validateAsync`.
// A synchronous `validate` call rejects async constraints instead of silently
// skipping them, so async rules can never pass unchecked.
const UsernameAvailable = defineAsyncConstraint<string, undefined>({
    name: 'usernameAvailable',
    validate: async (value) => {
        await new Promise((resolve) => setTimeout(resolve, 1)); // simulate a database lookup
        return value !== 'taken';
    },
    message: 'This username is already taken.'
});

@Model('SignupDto')
class SignupDto {
    @Required()
    @StartsWithA()
    code!: string;

    @Required()
    @UsernameAvailable()
    username!: string;
}

console.log('sync validate rejects the async constraint:');
try {
    validate({code: 'Alpha', username: 'free'}, SignupDto);
} catch (error) {
    console.log(' ', (error as Error).message);
}

const asyncResult = await validateAsync({code: 'Bravo', username: 'taken'}, SignupDto);
console.log('async validate result:', asyncResult.success);
if (!asyncResult.success) {
    for (const issue of asyncResult.issues) console.log(`  ${issue.path.join('.')}: ${issue.message}`);
}

// The generic `@Constraint(name, options)` decorator / `.constraint(name, options)`
// builder form attaches a payload the constraint's `validate` receives, surfaced as `issue.params`.
createAsyncConstraint<string, {prefix: string}>({
    name: 'hasPrefix',
    validate: (value, options) => typeof value === 'string' && value.startsWith(options.prefix),
    message: (options) => `Value must start with "${options.prefix}".`
});

@Model('PrefixedClassDto')
class PrefixedClassDto {
    @Required()
    @Constraint('hasPrefix', {prefix: 'B'})
    code!: string;
}

const decoratorResult = await validateAsync({code: 'Alpha'}, PrefixedClassDto);
console.log('decorator options payload result:', decoratorResult.success, decoratorResult.success ? undefined : decoratorResult.issues[0]?.params);

const PrefixedBuilderDto = model('PrefixedBuilderDto', {
    code: stringField().required().constraint('hasPrefix', {prefix: 'B'})
});
const builderResult = await validateAsync({code: 'Alpha'}, PrefixedBuilderDto);
console.log('builder options payload result:', builderResult.success, builderResult.success ? undefined : builderResult.issues[0]?.params);
