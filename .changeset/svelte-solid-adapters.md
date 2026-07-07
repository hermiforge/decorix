---
"@hermiforge-decorix/svelte-felte": minor
"@hermiforge-decorix/solid-felte": minor
"@hermiforge-decorix/solid-modular-forms": minor
"@hermiforge-decorix/svelte-superforms": minor
---

Add 4 new framework adapters, closing the "Svelte and SolidJS adapters" TODO with double coverage matching React/Vue: `svelte-felte` and `solid-felte` (Felte, config-shaped like FormKit/React Hook Form), `solid-modular-forms` (Modular Forms, whole-form `validate` option), and `svelte-superforms` (Superforms/`sveltekit-superforms`, implementing its own `ValidationAdapter` contract — SvelteKit-only, unlike the other three). `solid-forms` was replaced by Felte in the SolidJS lineup after finding it had almost no reliable documentation to verify against.
