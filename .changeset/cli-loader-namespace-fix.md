---
"@hermiforge-decorix/cli": patch
---

Fix `loadEntry` failing to resolve prebuilt package imports (observed with `@angular/core`'s `fesm2022` bundle under pnpm) with `Cannot find module '...core.mjs?namespace=...'`. The loader now registers tsx globally via `register()` instead of the scoped `tsImport()` API, which was unconditionally tagging every resolved module URL with an isolation query string that broke resolution of some prebuilt ESM exports.
