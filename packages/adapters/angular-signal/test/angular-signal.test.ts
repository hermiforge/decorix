import {describe, expect, it, vi} from 'vitest';
import {
    createAsyncConstraint,
    dateField,
    defineAsyncConstraint,
    defineConstraint,
    Email,
    EqualsField,
    Integer,
    Max,
    Min,
    MinLength,
    Model,
    model,
    numberField,
    Past,
    Required,
    stringField
} from '@hermiforge-decorix/core';
import {registerZodValidator} from '@hermiforge-decorix/zod';
import type {FieldTree} from '@angular/forms/signals';

/**
 * Exercising the real `form()`/`resource()` runtime requires a fully bootstrapped Angular
 * application (APP_ID, a change-detection scheduler, zone/zoneless wiring, etc. — the providers
 * `bootstrapApplication` sets up) that a plain unit test cannot construct without pulling in most of
 * `@angular/platform-browser`/`platform-server` plus a DOM. That's Angular's own bootstrap concern,
 * not Decorix's — the previous, fabricated adapter got away with skipping it because it never called
 * into the real API at all.
 *
 * So this suite fakes `@angular/forms/signals` and `@angular/core`'s `resource`/`signal` with minimal,
 * behavior-preserving stand-ins that record how `toSignalForm` calls the *real* API: which native
 * validator (`required`/`minLength`/`email`/...) it invokes for which constraint, with which path and
 * message, and — for the `validate()`/`validateAsync()` fallbacks — that the callback it registers
 * produces the right `{kind, message}` (or `null`) for a given field context. This directly targets the
 * bug class this rewrite fixes (wrong function, wrong argument shape) without needing a real app.
 */
type NativeCall = {rule: string; path: string; arg?: unknown; message?: string};
type ValidateCall = {path: string; fn: (ctx: unknown) => unknown};
type ValidateAsyncCall = {path: string; opts: Record<string, unknown>};

let nativeCalls: NativeCall[] = [];
let validateCalls: ValidateCall[] = [];
let validateAsyncCalls: ValidateAsyncCall[] = [];

function pathName(path: unknown): string {
    return (path as {__name: string}).__name;
}

vi.mock('@angular/core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@angular/core')>();
    return {
        ...actual,
        signal: (initial: unknown) => {
            let value = initial;
            const fn = (() => value) as unknown as {(): unknown; set: (next: unknown) => void};
            fn.set = (next: unknown) => {
                value = next;
            };
            return fn;
        },
        resource: (options: {loader: (args: {params: unknown}) => unknown; params: () => unknown}) => options
    };
});

vi.mock('@angular/forms/signals', () => ({
    form: (model: () => Record<string, unknown>, schemaFn: (path: unknown) => void) => {
        const initial = model();
        const rootPath = new Proxy(
            {},
            {get: (_target, name: string) => ({__name: name})}
        );
        schemaFn(rootPath);
        return {__initial: initial};
    },
    required: (path: unknown, opts?: {message?: string}) => nativeCalls.push({rule: 'required', path: pathName(path), message: opts?.message}),
    minLength: (path: unknown, n: number, opts?: {message?: string}) => nativeCalls.push({rule: 'minLength', path: pathName(path), arg: n, message: opts?.message}),
    maxLength: (path: unknown, n: number, opts?: {message?: string}) => nativeCalls.push({rule: 'maxLength', path: pathName(path), arg: n, message: opts?.message}),
    min: (path: unknown, n: number, opts?: {message?: string}) => nativeCalls.push({rule: 'min', path: pathName(path), arg: n, message: opts?.message}),
    max: (path: unknown, n: number, opts?: {message?: string}) => nativeCalls.push({rule: 'max', path: pathName(path), arg: n, message: opts?.message}),
    email: (path: unknown, opts?: {message?: string}) => nativeCalls.push({rule: 'email', path: pathName(path), message: opts?.message}),
    pattern: (path: unknown, regex: RegExp, opts?: {message?: string}) => nativeCalls.push({rule: 'pattern', path: pathName(path), arg: regex, message: opts?.message}),
    validate: (path: unknown, fn: (ctx: unknown) => unknown) => validateCalls.push({path: pathName(path), fn}),
    validateAsync: (path: unknown, opts: Record<string, unknown>) => validateAsyncCalls.push({path: pathName(path), opts})
}));

const {toSignalForm} = await import('../src/index');

/** Reusable custom sync constraint for the builder/decorator symmetry tests. */
const SignalStartsWithA = defineConstraint<string, undefined>({
    name: 'signalStartsWithA',
    validate: (value) => typeof value === 'string' && value.startsWith('A'),
    message: 'Must start with A'
});

/** Reusable custom async constraint exercised in decorator mode. */
const SignalAsyncDeco = defineAsyncConstraint<string, undefined>({
    name: 'signalAsyncDeco',
    validate: async (value) => value !== 'taken',
    message: 'Already taken'
});

/** Fakes the `FieldContext` object Angular passes into `validate()`/`onSuccess` callbacks. */
function fakeFieldContext(value: unknown, valueOf: (path: unknown) => unknown = () => undefined) {
    return {value: () => value, valueOf: (path: unknown) => valueOf(path)};
}

describe('@hermiforge-decorix/angular-signal', () => {
    it('maps required/minLength/email onto the real native validators, with the right paths and messages', () => {
        registerZodValidator({name: 'zod-angular-signal-class'});
        nativeCalls = [];

        @Model('SignupDto')
        class SignupDto {
            @Required()
            @MinLength(2, 'Name too short')
            name!: string;

            @Required()
            @Email('Invalid email')
            email!: string;
        }

        toSignalForm(SignupDto);

        expect(nativeCalls).toContainEqual({rule: 'required', path: 'name', message: undefined});
        expect(nativeCalls).toContainEqual({rule: 'minLength', path: 'name', arg: 2, message: 'Name too short'});
        expect(nativeCalls).toContainEqual({rule: 'required', path: 'email', message: undefined});
        expect(nativeCalls).toContainEqual({rule: 'email', path: 'email', message: 'Invalid email'});

        // Type-level proof: `TModel` is inferred straight from the class, with no
        // explicit `toSignalForm<SignupDto>(...)` and no `Pick<SignupDto, keyof SignupDto>`
        // workaround — this line would fail to compile otherwise.
        const typedForm: FieldTree<SignupDto> = toSignalForm(SignupDto, {initialValue: {name: 'Ada', email: 'ada@example.com'}});
        expect(typedForm).toBeDefined();
    });

    it('maps builder constraints onto native validators the same way', () => {
        registerZodValidator({name: 'zod-angular-signal-builder'});
        nativeCalls = [];
        const user = model('SignupDto', {
            name: stringField().required().minLength(2, 'Name too short'),
            email: stringField().required().email('Invalid email'),
            age: numberField().min(18, 'Too young').optional()
        });

        toSignalForm(user);

        expect(nativeCalls).toContainEqual({rule: 'email', path: 'email', message: 'Invalid email'});
        expect(nativeCalls).toContainEqual({rule: 'min', path: 'age', arg: 18, message: 'Too young'});
        expect(nativeCalls.some((call) => call.rule === 'required' && call.path === 'age')).toBe(false);
    });

    it('throws when no validator can be resolved for a fallback constraint', () => {
        const user = model('SignupDto', {
            code: stringField().required().constraint('missing-angular-signal-constraint')
        });

        expect(() => toSignalForm(user)).toThrow('No Decorix constraint registered');
    });

    it('registers a validate() fallback for constraints without a native Angular validator', () => {
        validateCalls = [];
        const article = model('SignalFallbackDto', {
            slug: stringField().required().slug('Invalid slug')
        });

        toSignalForm(article);

        const call = validateCalls.find((entry) => entry.path === 'slug');
        expect(call).toBeDefined();
        expect(call!.fn(fakeFieldContext('Bad Slug'))).toEqual({kind: 'slug', message: 'Invalid slug'});
        expect(call!.fn(fakeFieldContext('valid-slug'))).toBeNull();
    });

    it('registers a validateAsync() fallback for async constraints', async () => {
        validateAsyncCalls = [];
        createAsyncConstraint<unknown, undefined>({
            name: 'signalAsyncAvailable',
            validate: async (value) => value !== 'taken',
            message: 'Already taken'
        });
        const metadata = model('SignalAsyncDto', {
            username: stringField().required().constraint('signalAsyncAvailable')
        });

        toSignalForm(metadata);

        const call = validateAsyncCalls.find((entry) => entry.path === 'username');
        expect(call).toBeDefined();
        const onSuccess = call!.opts.onSuccess as (result: unknown, ctx: unknown) => unknown;
        expect(onSuccess(true, fakeFieldContext('free'))).toBeNull();
        expect(onSuccess(false, fakeFieldContext('taken'))).toEqual({kind: 'signalAsyncAvailable', message: 'Already taken'});
    });

    it('enforces a custom sync constraint in builder and decorator mode', () => {
        registerZodValidator({name: 'zod-angular-signal-custom-sync'});
        validateCalls = [];

        const builder = model('SignalCustomSyncBuilderDto', {
            code: stringField().required().constraint(SignalStartsWithA)
        });
        toSignalForm(builder);
        const builderCall = validateCalls.find((entry) => entry.path === 'code');
        expect(builderCall!.fn(fakeFieldContext('Bravo'))).toEqual({kind: 'signalStartsWithA', message: 'Must start with A'});
        expect(builderCall!.fn(fakeFieldContext('Alpha'))).toBeNull();

        validateCalls = [];
        @Model('SignalCustomSyncClassDto')
        class SignalCustomSyncClassDto {
            @Required()
            @SignalStartsWithA()
            code!: string;
        }
        toSignalForm(SignalCustomSyncClassDto);
        const classCall = validateCalls.find((entry) => entry.path === 'code');
        expect(classCall!.fn(fakeFieldContext('Bravo'))).toEqual({kind: 'signalStartsWithA', message: 'Must start with A'});
        expect(classCall!.fn(fakeFieldContext('Alpha'))).toBeNull();
    });

    it('resolves a custom async constraint declared in decorator mode', async () => {
        registerZodValidator({name: 'zod-angular-signal-async-class'});
        validateAsyncCalls = [];

        @Model('SignalAsyncClassDto')
        class SignalAsyncClassDto {
            @Required()
            @SignalAsyncDeco()
            username!: string;
        }

        toSignalForm(SignalAsyncClassDto);
        const call = validateAsyncCalls.find((entry) => entry.path === 'username');
        const onSuccess = call!.opts.onSuccess as (result: unknown, ctx: unknown) => unknown;
        expect(onSuccess(true, fakeFieldContext('free'))).toBeNull();
        expect(onSuccess(false, fakeFieldContext('taken'))).toEqual({kind: 'signalAsyncDeco', message: 'Already taken'});
    });

    it('enforces a cross-field constraint declared in decorator mode', () => {
        registerZodValidator({name: 'zod-angular-signal-crossfield-class'});
        validateCalls = [];

        @Model('SignalCrossFieldClassDto')
        class SignalCrossFieldClassDto {
            @Required()
            password!: string;

            @EqualsField('password', 'Passwords must match')
            confirmPassword?: string;
        }

        toSignalForm(SignalCrossFieldClassDto);
        const call = validateCalls.find((entry) => entry.path === 'confirmPassword');
        const valueOf = (path: unknown) => (pathName(path) === 'password' ? 'a' : undefined);
        expect(call!.fn(fakeFieldContext('b', valueOf))).toEqual({kind: 'equalsField', message: 'Passwords must match'});
        expect(call!.fn(fakeFieldContext('a', valueOf))).toBeNull();
    });

    it('enforces native number and date constraints in builder and decorator mode', () => {
        registerZodValidator({name: 'zod-angular-signal-natives'});
        nativeCalls = [];

        const builder = model('SignalNativeBuilderDto', {
            age: numberField().min(18).max(65).integer(),
            createdAt: dateField().past()
        });
        toSignalForm(builder);
        expect(nativeCalls).toContainEqual({rule: 'min', path: 'age', arg: 18, message: undefined});
        expect(nativeCalls).toContainEqual({rule: 'max', path: 'age', arg: 65, message: undefined});

        nativeCalls = [];
        @Model('SignalNativeClassDto')
        class SignalNativeClassDto {
            @Min(18)
            @Max(65)
            @Integer()
            age!: number;

            @Past()
            createdAt!: Date;
        }
        toSignalForm(SignalNativeClassDto);
        expect(nativeCalls).toContainEqual({rule: 'min', path: 'age', arg: 18, message: undefined});
        expect(nativeCalls).toContainEqual({rule: 'max', path: 'age', arg: 65, message: undefined});
    });
});
