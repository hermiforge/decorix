# @hermiforge-decorix/svelte-superforms

![Decorix](../../../decorix.png)

[Superforms](https://superforms.rocks) (`sveltekit-superforms`) validator adapter for Decorix metadata. Unlike the other framework adapters, this implements Superforms' own `ValidationAdapter<Out, In>` contract — the same shape its built-in `zod()`/`valibot()` helpers return — since Superforms requires that exact contract from `superValidate(adapter)`/`superForm`.

> Full usage guide: [`docs/`](https://github.com/hermiforge/decorix/blob/main/docs/README.md) (narrative walkthrough beyond this package's API reference).

**Requires SvelteKit** (`@sveltejs/kit`), not plain Svelte — `sveltekit-superforms` is built around SvelteKit's server load/form actions. If you only use Svelte without SvelteKit, use [`@hermiforge-decorix/svelte-felte`](https://github.com/hermiforge/decorix/tree/main/packages/adapters/svelte-felte) instead.

## Install

```sh
pnpm add @hermiforge-decorix/core @hermiforge-decorix/svelte-superforms sveltekit-superforms @sveltejs/kit svelte
```

Peer dependencies: `svelte`, `@sveltejs/kit`, `sveltekit-superforms@^2.30.0`. `@hermiforge-decorix/json-schema` is a direct (non-optional) dependency, reused internally to build the adapter's required `jsonSchema` field. `@hermiforge-decorix/zod` is only needed if you opt into Zod-backed validation instead of the core facade — see Validator Notes below.

## Decorated Class

```ts
// +page.server.ts
import {Email, MinLength, Model, Required} from '@hermiforge-decorix/core';
import {createSuperformsValidatorAdapter} from '@hermiforge-decorix/svelte-superforms';
import {superValidate} from 'sveltekit-superforms/server';
import {fail} from '@sveltejs/kit';

@Model('SignupDto')
class SignupDto {
  @Required('Name is required')
  @MinLength(2, 'Name is too short')
  name!: string;

  @Required('Email is required')
  @Email('Invalid email')
  email!: string;
}

const adapter = createSuperformsValidatorAdapter(SignupDto);

export const load = async () => ({form: await superValidate(adapter)});

export const actions = {
  default: async ({request}) => {
    const form = await superValidate(request, adapter);
    if (!form.valid) return fail(400, {form});
    // ... form.data is validated
    return {form};
  }
};
```

```svelte
<!-- +page.svelte -->
<script lang="ts">
  import {superForm} from 'sveltekit-superforms';
  let {data} = $props();
  const {form, errors, enhance} = superForm(data.form);
</script>

<form method="POST" use:enhance>
  <input name="name" bind:value={$form.name} />
  {#if $errors.name}<span>{$errors.name}</span>{/if}
  <input name="email" bind:value={$form.email} />
  {#if $errors.email}<span>{$errors.email}</span>{/if}
</form>
```

`T` is inferred straight from `SignupDto` — `form.data` above is already typed `SignupDto`, no separate form-values type or cast needed.

## Builder Model

```ts
import {model, stringField} from '@hermiforge-decorix/core';
import {createZodValidatorAdapter} from '@hermiforge-decorix/zod';
import {createSuperformsValidatorAdapter} from '@hermiforge-decorix/svelte-superforms';

const SignupDto = model('SignupDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short'),
  email: stringField().required('Email is required').email('Invalid email')
});

const adapter = createSuperformsValidatorAdapter(SignupDto, {
  initialValues: {name: 'Ada'},
  validator: createZodValidatorAdapter()
});
```

## Validator Notes

`createSuperformsValidatorAdapter` always returns a full `ValidationAdapter`, whether or not `options.validator` is passed: when omitted, it falls back to Decorix's core validator facade — no extra install needed. Pass an explicit adapter through `options.validator` only if you want a different engine, such as Zod via `createZodValidatorAdapter()`. `registerZodValidator()`'s global registration is **not** consulted here.

Superforms' own built-in adapters derive `constraints` (HTML input constraints), `shape` (an array/object marker tree), and `defaults` from a JSON Schema using internal helpers (`constraints()`, `schemaShape()`, `defaultValues()`) that are **not** part of `sveltekit-superforms/adapters`'s public API — verified against the installed package's `dist/adapters/index.js`, which only re-exports per-library helpers (`zod`, `valibot`, ...) and `ValidationAdapter`'s type, not `createAdapter`/`createJsonSchema` or the derivation helpers. This adapter therefore builds `constraints`, `shape`, and `defaults` directly from Decorix field metadata instead (`src/defaults.ts`, `src/shape.ts`), and builds `jsonSchema` from `@hermiforge-decorix/json-schema`'s `toJsonSchema`.

`defaults` uses type-appropriate values (`''` for strings, `0` for numbers, `false` for booleans, the first enum value, `[]` for arrays) rather than `undefined`, since Superforms' bound inputs need concrete values — pass `options.initialValues` to override any of them (e.g. for `date` fields, which default to `undefined` since there is no safe non-null default).

`id` is set to the Decorix model's registered name (already a stable, unique identifier) rather than a schema hash.

## License

LGPL-3.0-or-later — see the [repository LICENSE](https://github.com/hermiforge/decorix/blob/main/LICENSE).
