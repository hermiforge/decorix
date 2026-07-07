import {dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

// Runs after `pnpm build`, against the real built dist/index.js (imported by
// absolute file path, never by package name/alias), to catch bundling
// regressions that `pnpm test` structurally cannot: vitest.config.ts aliases
// @hermiforge-decorix/core straight to packages/core/src/index.ts, so the
// test suite never actually loads what gets published. This script exists
// because of a real incident: packages/core/package.json's "sideEffects":
// false let rolldown/tsdown tree-shake the entire native-constraints.ts
// module (a bare side-effect-only import with no exports) out of every
// published dist since 0.1.0 — the constraint registry was empty in
// production the whole time, silently swallowed by adapters whose resolvers
// don't expect resolveConstraintDefinition to throw.

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function fail(message) {
    console.error(`\nverify-dist failed: ${message}`);
    process.exit(1);
}

const distEntry = join(root, 'packages/core/dist/index.js');
const {model, stringField, validate} = await import(pathToFileURL(distEntry).href);

const Dto = model('VerifyDistDto', {
    name: stringField().required().minLength(3)
});

let invalid;
try {
    invalid = validate({name: 'ab'}, Dto);
} catch (error) {
    fail(
        `validate() threw instead of returning issues — the native constraint registry is likely empty in the built dist ` +
            `(check packages/core/package.json's "sideEffects" field and the side-effect import in packages/core/src/index.ts). ` +
            `Original error: ${error instanceof Error ? error.message : String(error)}`
    );
}

if (invalid.success) fail('Expected an invalid payload (name too short) to fail validation against the real dist build.');
if (invalid.issues[0]?.constraint !== 'minLength') {
    fail(`Expected a "minLength" issue, got: ${JSON.stringify(invalid.issues)}`);
}

const valid = validate({name: 'Ada'}, Dto);
if (!valid.success) fail(`Expected a valid payload to pass validation against the real dist build, got: ${JSON.stringify(valid)}`);

console.log('verify-dist: native constraint registry populated correctly in packages/core/dist/index.js.');
