import {readFileSync, writeFileSync, existsSync, readdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Aggregates pending .changeset/*.md entries into one root CHANGELOG.md section
// before `changeset version` consumes and deletes them. Every
// @hermiforge-decorix/* package is versioned together (.changeset/config.json's
// `fixed` group), so a single root section per release is more useful than
// digging through 15 per-package CHANGELOG.md files for the same story. Must
// run before `changeset version` — see the root package.json `version` script
// and scripts/ci-release.mjs.

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const changesetDir = join(root, '.changeset');
const changelogPath = join(root, 'CHANGELOG.md');

const BUMP_ORDER = {patch: 1, minor: 2, major: 3};
const BUMP_LABEL = {major: 'Major Changes', minor: 'Minor Changes', patch: 'Patch Changes'};

/** Reads every pending changeset, keeping one entry per file (not per affected package). */
function readPendingChangesets() {
    return readdirSync(changesetDir)
        .filter((name) => name.endsWith('.md') && name !== 'README.md')
        .map((name) => {
            const content = readFileSync(join(changesetDir, name), 'utf8');
            const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
            if (!match) throw new Error(`Malformed changeset frontmatter: ${name}`);
            const [, frontmatter, body] = match;
            const bumps = [...frontmatter.matchAll(/"[^"]+"\s*:\s*(major|minor|patch)/g)].map((m) => m[1]);
            if (!bumps.length) throw new Error(`No package bumps found in changeset: ${name}`);
            const level = bumps.reduce((worst, bump) => (BUMP_ORDER[bump] > BUMP_ORDER[worst] ? bump : worst), 'patch');
            return {name, level, body: body.trim()};
        });
}

/** Mirrors changesets' own fixed-group logic: the release version bump is the highest bump across every pending changeset. */
function highestLevel(changesets) {
    return changesets.reduce((worst, {level}) => (BUMP_ORDER[level] > BUMP_ORDER[worst] ? level : worst), 'patch');
}

function bumpVersion(version, level) {
    const [major, minor, patch] = version.split('.').map(Number);
    if (level === 'major') return `${major + 1}.0.0`;
    if (level === 'minor') return `${major}.${minor + 1}.0`;
    return `${major}.${minor}.${patch + 1}`;
}

function renderSection(version, changesets) {
    let section = `## ${version}\n`;
    for (const level of ['major', 'minor', 'patch']) {
        const entries = changesets.filter((changeset) => changeset.level === level);
        if (!entries.length) continue;
        section += `\n### ${BUMP_LABEL[level]}\n\n`;
        for (const {body} of entries) {
            section += `- ${body.replace(/\n/g, '\n  ')}\n\n`;
        }
    }
    return section.trimEnd() + '\n';
}

const changesets = readPendingChangesets();
if (changesets.length === 0) {
    console.log('No pending changesets — root CHANGELOG.md left untouched.');
    process.exit(0);
}

const currentVersion = JSON.parse(readFileSync(join(root, 'packages/core/package.json'), 'utf8')).version;
const nextVersion = bumpVersion(currentVersion, highestLevel(changesets));
const newSection = renderSection(nextVersion, changesets);

const existing = existsSync(changelogPath) ? readFileSync(changelogPath, 'utf8') : '# Decorix\n';
const headingMatch = existing.match(/^# .+\r?\n/);
const heading = headingMatch ? headingMatch[0].trimEnd() + '\n' : '# Decorix\n';
const rest = headingMatch ? existing.slice(headingMatch[0].length) : existing;
const updated = `${heading}\n${newSection}\n${rest.trimStart()}`.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';

writeFileSync(changelogPath, updated);
console.log(`Added root CHANGELOG.md section for ${nextVersion} (${changesets.length} changeset(s)).`);
