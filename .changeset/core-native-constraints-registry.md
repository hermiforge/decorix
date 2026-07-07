---
"@hermiforge-decorix/core": patch
---

Fix the native constraint registry (`required`, `minLength`, `email`, and ~40 others) shipping empty in every published version since `0.1.0`. `packages/core/src/index.ts` registered native constraints via a bare `import './validation/native-constraints'` with no exports used — bundlers (rolldown/tsdown) tree-shook the entire module out of `dist/index.js`/`dist/index.cjs`, since its only effect (mutating the shared constraint registry) wasn't visible from any used export. Every call to `validate()`/`validateAsync()` against a native constraint then threw `No Decorix constraint registered for "..."`, which resolver-style adapters (e.g. React Hook Form) swallow silently — so validation appeared to just never produce errors. Fixed by calling `registerNativeConstraints()` directly in `index.ts` (the entry module), whose top-level code a bundler never eliminates, instead of hiding the call inside an otherwise-unused imported module.
