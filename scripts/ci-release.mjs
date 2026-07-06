import {readFileSync, readdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

// Runs in GitLab CI on push to `main` (i.e. after a dev -> main merge). Unlike
// scripts/tag-release.mjs (interactive, local git identity already
// authenticated), this script builds its own authenticated remote URLs from
// CI environment variables and is meant to run unattended.

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function readPackageVersion() {
    return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
}

/** Runs a command and returns trimmed stdout, or null if it exits non-zero. */
function run(command, args) {
    // shell: true so `pnpm` resolves through its Windows .cmd shim during local
    // testing; harmless on the Linux CI image, which also has a shell.
    const result = spawnSync(command, args, {cwd: root, encoding: 'utf8', shell: true});
    if (result.status !== 0) return null;
    return result.stdout.trim();
}

/** Runs a command with inherited stdio (output visible in CI logs), returns the exit code. */
function runInherit(command, args) {
    console.log(`\n$ ${command} ${args.join(' ')}`);
    const result = spawnSync(command, args, {cwd: root, stdio: 'inherit', shell: true});
    return result.status ?? 1;
}

function fail(message) {
    console.error(`\nError: ${message}`);
    process.exit(1);
}

function requireEnv(name) {
    const value = process.env[name];
    if (!value) fail(`Missing required environment variable ${name}.`);
    return value;
}

// 1. Skip cleanly if there is nothing to release: changesets are files under
// .changeset/*.md other than the README that ships with the tool.
const changesetDir = join(root, '.changeset');
const pendingChangesets = readdirSync(changesetDir).filter((name) => name.endsWith('.md') && name !== 'README.md');
if (pendingChangesets.length === 0) {
    console.log('No pending changesets — nothing to release. Exiting successfully.');
    process.exit(0);
}
console.log(`Found ${pendingChangesets.length} pending changeset(s): ${pendingChangesets.join(', ')}`);

// 2. Bump versions, update changelogs, and consume the changesets.
if (runInherit('pnpm', ['changeset', 'version']) !== 0) fail('pnpm changeset version failed.');

const version = readPackageVersion();
const tag = `v${version}`;
console.log(`New version: ${version} -> tag ${tag}`);

// 3. Commit the version bump.
runInherit('git', ['config', 'user.name', process.env.GIT_AUTHOR_NAME ?? 'Decorix CI']);
runInherit('git', ['config', 'user.email', process.env.GIT_AUTHOR_EMAIL ?? 'ci@hermiforge.dev']);
if (runInherit('git', ['add', '-A']) !== 0) fail('git add failed.');
if (runInherit('git', ['commit', '-m', `chore: release ${tag}`]) !== 0) fail('git commit failed.');

// 4. Rebuild so the artifact this job exposes has dist/ matching the bumped versions.
if (runInherit('pnpm', ['build']) !== 0) fail('pnpm build failed.');

// 5. Tag the release commit.
const head = run('git', ['rev-parse', 'HEAD']);
if (!head) fail('Could not resolve HEAD after committing.');
if (run('git', ['rev-list', '-n', '1', tag]) !== null) {
    fail(`Tag ${tag} already exists locally — a version bump to an already-tagged version is unexpected; investigate before retrying.`);
}
if (runInherit('git', ['tag', '-a', tag, '-m', tag, 'HEAD']) !== 0) fail(`Could not create tag ${tag}.`);

// 6. Push the release commit and tag to GitLab and GitHub.
const gitlabToken = requireEnv('GITLAB_PUSH_TOKEN');
const githubToken = requireEnv('GITHUB_PUSH_TOKEN');
const gitlabUrl = `https://oauth2:${gitlabToken}@gitlab.com/hermiforge/decorix.git`;
const githubUrl = `https://x-access-token:${githubToken}@github.com/hermiforge/decorix.git`;

const pushes = [
    {url: gitlabUrl, ref: `${head}:refs/heads/main`, label: 'GitLab main'},
    {url: githubUrl, ref: `${head}:refs/heads/main`, label: 'GitHub main'}
];
for (const {url, ref, label} of pushes) {
    if (runInherit('git', ['push', url, ref]) !== 0) fail(`Failed to push to ${label}.`);
}
for (const {url, label} of [{url: gitlabUrl, label: 'GitLab'}, {url: githubUrl, label: 'GitHub'}]) {
    if (runInherit('git', ['push', url, tag]) !== 0) fail(`Failed to push tag ${tag} to ${label}.`);
}

// 7. Best-effort fast-forward of the release commit onto GitLab `dev`, so the
// next round of work doesn't start behind `main`. Never force-pushes a shared
// branch — a failed fast-forward here just means dev has diverged and needs
// a manual resync, which is reported but does not fail the release itself.
console.log('\nAttempting to fast-forward GitLab dev to the release commit...');
const devPush = runInherit('git', ['push', gitlabUrl, `${head}:refs/heads/dev`]);
if (devPush !== 0) {
    console.warn('\nWarning: could not fast-forward `dev` to the release commit (it likely has commits that diverge from `main`). The release itself succeeded; resync `dev` manually.');
}

console.log(`\nDone: ${tag} released to GitLab main and GitHub main. Run the manual "publish-npm" job to publish to npm.`);
