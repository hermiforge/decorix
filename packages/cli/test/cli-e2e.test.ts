import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';
import {runCli, type CliIO} from '../src/cli';

/**
 * End-to-end tests that exercise the real `runCli` entry point against on-disk
 * `.ts` fixtures. Unlike `cli.test.ts` (which unit-tests the pure render
 * functions against in-memory objects), these drive `loadEntry` — the tsx-based
 * loader path where the decorator-emit and cross-instance registry bugs lived.
 */

/** Resolves a fixture path to an absolute path so it is independent of the test runner CWD. */
const fixture = (name: string): string => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

/** Collects CLI output and file writes for assertions. */
function captureIO(): CliIO & {output: string; files: Map<string, string>} {
    const lines: string[] = [];
    const files = new Map<string, string>();
    return {
        log: (message) => lines.push(message),
        error: (message) => lines.push(message),
        writeFile: (path, content) => {
            files.set(path, content);
        },
        get output() {
            return lines.join('\n');
        },
        files
    };
}

describe('@decorix/cli end-to-end', () => {
    it('scans a decorator DTO loaded from disk (regression: legacy-decorator emit + cross-instance registry)', async () => {
        const io = captureIO();
        await runCli(['scan', fixture('decorator-dto.ts')], io);
        expect(io.output).toContain('CliUserDto (export CliUserDto)');
        expect(io.output).toContain('name: string [maxLength, minLength, required]');
        expect(io.output).toContain('email: string [email, required]');
        expect(io.output).toContain('age: number [min]');
    });

    it('scans a builder DTO loaded from disk', async () => {
        const io = captureIO();
        await runCli(['scan', fixture('builder-dto.ts')], io);
        expect(io.output).toContain('CliProductDto (export CliProductDto)');
        expect(io.output).toContain('title: string [required, minLength]');
        expect(io.output).toContain('price: number [min]');
    });

    it('emits JSON Schema for a decorator DTO', async () => {
        const io = captureIO();
        await runCli(['json-schema', fixture('decorator-dto.ts'), '--model', 'CliUserDto'], io);
        const artifact = JSON.parse(io.output);
        expect(artifact).toMatchObject({
            title: 'CliUserDto',
            type: 'object',
            required: ['name', 'email'],
            properties: {
                email: {type: 'string', format: 'email'},
                age: {type: 'number', minimum: 18}
            }
        });
    });

    it('emits a thin Zod re-export module for a decorator DTO', async () => {
        const io = captureIO();
        await runCli(['zod', fixture('decorator-dto.ts'), '--model', 'CliUserDto'], io);
        expect(io.output).toContain(`import {toZod} from '@decorix/zod';`);
        expect(io.output).toContain(`export const CliUserDtoSchema = toZod(CliUserDto);`);
    });

    it('honors an explicit --tsconfig override', async () => {
        const io = captureIO();
        await runCli(['scan', fixture('decorator-dto.ts'), '--tsconfig', fixture('tsconfig.json')], io);
        expect(io.output).toContain('CliUserDto (export CliUserDto)');
    });

    it('surfaces custom named constraints from decorator and builder models', async () => {
        const io = captureIO();
        await runCli(['scan', fixture('custom-constraint-dto.ts')], io);
        expect(io.output).toContain('CliCustomClassDto (export CliCustomClassDto)');
        expect(io.output).toContain('CliCustomBuilderDto (export CliCustomBuilderDto)');
        // The custom constraint name appears for both authoring modes.
        expect(io.output.match(/startsWithA/g)).toHaveLength(2);
    });
});
