/**
 * Copies the version in `package.json`, which Changesets bumps, into each tool's plugin manifest.
 *
 * Usage: node --experimental-strip-types scripts/sync-version.mts [--check]
 *
 * With `--check` it changes nothing and exits 1 when a manifest's version differs.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const MANIFESTS = ['.claude-plugin/plugin.json', '.codex-plugin/plugin.json', '.cursor-plugin/plugin.json'];

const root = path.resolve(import.meta.dirname, '..');
const check = process.argv.includes('--check');
const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
let stale = 0;

for (const file of MANIFESTS) {
	const fullPath = path.join(root, file);
	const source = readFileSync(fullPath, 'utf8');
	const current = JSON.parse(source).version;
	if (current === version) continue;
	if (check) {
		console.error(
			`[error] ${file} is at ${current}; package.json is at ${version}. Run the changeset:version script.`,
		);
		stale++;
		continue;
	}
	writeFileSync(fullPath, source.replace(/"version": "[^"]*"/, `"version": "${version}"`));
	console.log(`${file}: ${current} -> ${version}`);
}

if (stale > 0) process.exit(1);
