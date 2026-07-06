#!/usr/bin/env node
import {runCli} from '../dist/index.js';

runCli(process.argv.slice(2)).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    // Legacy Decorix decorators crash under TC39-standard decorator emit; hint at the tsconfig fix.
    if (message.includes("reading 'constructor'")) {
        console.error("Hint: your DTO uses decorators — ensure the resolved tsconfig sets \"experimentalDecorators\": true, or pass --tsconfig <file>.");
    }
    process.exitCode = 1;
});
