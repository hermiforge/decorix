---
"@hermiforge-decorix/cli": patch
---

Fix `loadEntry` crashing with `Cannot read properties of undefined (reading 'constructor')` on Angular CLI/Nx-style workspaces, where the root `tsconfig.json` uses `"files": []` plus `"references"` to `tsconfig.app.json`/`tsconfig.spec.json`. tsx only applies a tsconfig's `experimentalDecorators` to a file when that tsconfig's `files`/`include` actually covers it; a solution-style root config covers nothing, so tsx silently fell back to TC39 standard decorators and crashed legacy-decorator registration. `loadEntry` now uses `get-tsconfig` to follow `references` and find the config that actually covers the entry file (e.g. `tsconfig.app.json`) before handing it to tsx.
