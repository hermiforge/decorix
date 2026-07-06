import {writeFileSync} from 'node:fs';
import {cac} from 'cac';
import {discoverModels, loadEntry} from './loader';
import {
    renderAngularSignalModule,
    renderAngularValidatorsModule,
    renderJsonSchema,
    renderNestModule,
    renderReactHookFormModule,
    renderReactTanStackFormModule,
    renderScan,
    renderVueFormKitModule,
    renderVueVeeValidateModule,
    renderZodModule,
    selectModel
} from './generators';

/** Output sink for the CLI, injectable so commands can be tested without touching stdout or disk. */
export type CliIO = {
    log(message: string): void;
    error(message: string): void;
    writeFile(path: string, content: string): void;
};

/** Options shared by artifact-emitting commands. */
type ArtifactOptions = {model?: string; out?: string; tsconfig?: string};

/** Options for the scan command. */
type ScanOptions = {tsconfig?: string};

const defaultIO: CliIO = {
    log: (message) => console.log(message),
    error: (message) => console.error(message),
    writeFile: (path, content) => writeFileSync(path, content, 'utf8')
};

/**
 * Runs the Decorix CLI against the supplied argument list.
 *
 * @param args - CLI arguments without the node/script prefix (e.g. `['scan', './dtos.ts']`).
 * @param io - Output sink. Defaults to console + filesystem.
 */
export async function runCli(args: string[], io: CliIO = defaultIO): Promise<void> {
    const cli = cac('decorix');

    const tsconfigHelp = 'Path to a tsconfig.json (defaults to the nearest one; must enable experimentalDecorators)';

    cli.command('scan <entry>', 'List Decorix models found in an entry module')
        .option('--tsconfig <file>', tsconfigHelp)
        .action(async (entry: string, options: ScanOptions) => {
            const models = discoverModels(await loadEntry(entry, options.tsconfig));
            io.log(renderScan(models));
        });

    cli.command('json-schema <entry>', 'Emit JSON Schema for a model')
        .option('--model <name>', 'Model name or export to select')
        .option('--out <file>', 'Write output to a file instead of stdout')
        .option('--tsconfig <file>', tsconfigHelp)
        .action(async (entry: string, options: ArtifactOptions) => {
            const model = selectModel(discoverModels(await loadEntry(entry, options.tsconfig)), options.model);
            emit(io, options.out, renderJsonSchema(model));
        });

    cli.command('zod <entry>', 'Emit a Zod schema module for a model')
        .option('--model <name>', 'Model name or export to select')
        .option('--out <file>', 'Write output to a file instead of stdout')
        .option('--tsconfig <file>', tsconfigHelp)
        .action(async (entry: string, options: ArtifactOptions) => {
            const model = selectModel(discoverModels(await loadEntry(entry, options.tsconfig)), options.model);
            emit(io, options.out, renderZodModule(entry, model));
        });

    cli.command('angular-validators <entry>', 'Emit an Angular reactive form config module for a model')
        .option('--model <name>', 'Model name or export to select')
        .option('--out <file>', 'Write output to a file instead of stdout')
        .option('--tsconfig <file>', tsconfigHelp)
        .action(async (entry: string, options: ArtifactOptions) => {
            const model = selectModel(discoverModels(await loadEntry(entry, options.tsconfig)), options.model);
            emit(io, options.out, renderAngularValidatorsModule(entry, model));
        });

    cli.command('angular-signal <entry>', 'Emit an Angular Signal Forms module for a model')
        .option('--model <name>', 'Model name or export to select')
        .option('--out <file>', 'Write output to a file instead of stdout')
        .option('--tsconfig <file>', tsconfigHelp)
        .action(async (entry: string, options: ArtifactOptions) => {
            const model = selectModel(discoverModels(await loadEntry(entry, options.tsconfig)), options.model);
            emit(io, options.out, renderAngularSignalModule(entry, model));
        });

    cli.command('react-hook-form <entry>', 'Emit a React Hook Form config module for a model')
        .option('--model <name>', 'Model name or export to select')
        .option('--out <file>', 'Write output to a file instead of stdout')
        .option('--tsconfig <file>', tsconfigHelp)
        .action(async (entry: string, options: ArtifactOptions) => {
            const model = selectModel(discoverModels(await loadEntry(entry, options.tsconfig)), options.model);
            emit(io, options.out, renderReactHookFormModule(entry, model));
        });

    cli.command('react-tanstack-form <entry>', 'Emit a TanStack Form config module for a model')
        .option('--model <name>', 'Model name or export to select')
        .option('--out <file>', 'Write output to a file instead of stdout')
        .option('--tsconfig <file>', tsconfigHelp)
        .action(async (entry: string, options: ArtifactOptions) => {
            const model = selectModel(discoverModels(await loadEntry(entry, options.tsconfig)), options.model);
            emit(io, options.out, renderReactTanStackFormModule(entry, model));
        });

    cli.command('vue-formkit <entry>', 'Emit a FormKit schema config module for a model')
        .option('--model <name>', 'Model name or export to select')
        .option('--out <file>', 'Write output to a file instead of stdout')
        .option('--tsconfig <file>', tsconfigHelp)
        .action(async (entry: string, options: ArtifactOptions) => {
            const model = selectModel(discoverModels(await loadEntry(entry, options.tsconfig)), options.model);
            emit(io, options.out, renderVueFormKitModule(entry, model));
        });

    cli.command('vue-vee-validate <entry>', 'Emit a VeeValidate config module for a model')
        .option('--model <name>', 'Model name or export to select')
        .option('--out <file>', 'Write output to a file instead of stdout')
        .option('--tsconfig <file>', tsconfigHelp)
        .action(async (entry: string, options: ArtifactOptions) => {
            const model = selectModel(discoverModels(await loadEntry(entry, options.tsconfig)), options.model);
            emit(io, options.out, renderVueVeeValidateModule(entry, model));
        });

    cli.command('nest <entry>', 'Emit a Nest validation pipe module for a model')
        .option('--model <name>', 'Model name or export to select')
        .option('--out <file>', 'Write output to a file instead of stdout')
        .option('--tsconfig <file>', tsconfigHelp)
        .action(async (entry: string, options: ArtifactOptions) => {
            const model = selectModel(discoverModels(await loadEntry(entry, options.tsconfig)), options.model);
            emit(io, options.out, renderNestModule(entry, model));
        });

    cli.help();
    // cac slices the first two argv entries, so pad with placeholders for node/script.
    cli.parse(['', '', ...args], {run: false});
    await cli.runMatchedCommand();
}

/** Writes content to a file when `out` is set, otherwise logs it. */
function emit(io: CliIO, out: string | undefined, content: string): void {
    if (out) {
        io.writeFile(out, content);
        io.log(`Wrote ${out}`);
    } else {
        io.log(content);
    }
}
