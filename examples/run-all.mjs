import {readdirSync, statSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root = dirname(fileURLToPath(import.meta.url));

function collectExampleFiles(dir) {
    const files = [];
    for (const entry of readdirSync(dir).sort()) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            files.push(...collectExampleFiles(full));
        } else if (entry.endsWith('.ts')) {
            files.push(full);
        }
    }
    return files;
}

const files = collectExampleFiles(root);
let failures = 0;

const tsconfig = join(root, 'tsconfig.json');

for (const file of files) {
    console.log(`\n=== ${file.slice(root.length + 1)} ===`);
    // Register tsx as a Node loader hook instead of shelling out to the `tsx`
    // CLI binary, so no shell/PATH resolution is involved. The root
    // tsconfig.json declares `files: []`, so tsx's own upward tsconfig
    // discovery (relative to the current working directory, not the target
    // file) stops there without experimentalDecorators — point it at the
    // examples tsconfig explicitly via TSX_TSCONFIG_PATH (same fix as
    // packages/cli/src/loader.ts).
    const result = spawnSync(process.execPath, ['--import', 'tsx', file], {
        stdio: 'inherit',
        env: {...process.env, TSX_TSCONFIG_PATH: tsconfig}
    });
    if (result.status !== 0) failures += 1;
}

if (failures > 0) {
    console.error(`\n${failures} example(s) failed.`);
    process.exit(1);
}

console.log(`\nRan ${files.length} example(s) successfully.`);
