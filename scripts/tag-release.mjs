import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const force = process.argv.includes('--force');

/** Runs a git command and returns trimmed stdout, or null if it exits non-zero. */
function git(args) {
    const result = spawnSync('git', args, {cwd: root, encoding: 'utf8'});
    if (result.status !== 0) return null;
    return result.stdout.trim();
}

/** Runs a git command with inherited stdio (so push output/errors are visible), returns the exit code. */
function gitInherit(args) {
    console.log(`\n$ git ${args.join(' ')}`);
    const result = spawnSync('git', args, {cwd: root, stdio: 'inherit'});
    return result.status ?? 1;
}

function fail(message) {
    console.error(`\nError: ${message}`);
    process.exit(1);
}

// 1. Read the version to tag from the root package.json (source of truth; the
// 11 published packages are versioned together via .changeset/config.json's `fixed`).
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const tag = `v${pkg.version}`;
console.log(`Version: ${pkg.version} -> tag ${tag}`);

// 2. Refuse to tag a dirty working tree.
const statusOutput = git(['status', '--porcelain']);
if (statusOutput === null) fail('git status failed.');
if (statusOutput.length > 0) {
    fail('Working tree is not clean. Commit or stash changes before tagging.');
}

const head = git(['rev-parse', 'HEAD']);
if (!head) fail('Could not resolve HEAD.');

// 3-4. Create the annotated tag on HEAD, or leave it alone if it already points there.
const existingTagCommit = git(['rev-list', '-n', '1', tag]);
if (existingTagCommit === head) {
    console.log(`Tag ${tag} already points to HEAD (${head}) — nothing to do locally.`);
} else {
    if (existingTagCommit !== null) {
        console.log(`Tag ${tag} exists but points to ${existingTagCommit}; moving it to HEAD.`);
        if (gitInherit(['tag', '-d', tag]) !== 0) fail(`Could not delete existing local tag ${tag}.`);
    }
    if (gitInherit(['tag', '-a', tag, '-m', tag, 'HEAD']) !== 0) fail(`Could not create tag ${tag}.`);
}

// 5. Push the current commit to both remotes, matching each remote's branch naming.
const branchPushes = [
    {remote: 'origin', ref: 'HEAD:dev'},
    {remote: 'github', ref: 'HEAD:main'}
];
for (const {remote, ref} of branchPushes) {
    if (gitInherit(['push', remote, ref]) !== 0) fail(`Failed to push ${ref} to ${remote}.`);
}

// 6. Push the tag to both remotes; only force-overwrite a diverging remote tag if --force was passed.
for (const remote of ['origin', 'github']) {
    const args = force ? ['push', remote, tag, '--force'] : ['push', remote, tag];
    if (gitInherit(args) !== 0) {
        fail(`Failed to push tag ${tag} to ${remote}.${force ? '' : ' If the remote tag already exists and diverges, rerun with --force.'}`);
    }
}

console.log(`\nDone: ${tag} tagged and pushed to origin and github.`);
