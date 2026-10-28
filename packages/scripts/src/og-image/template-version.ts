import { openGraphImageHeight, openGraphImageWidth } from '@spectralcodex/shared/open-graph';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { findPackageJSON } from 'node:module';

// Everything that decides a card's pixels; hashed so a template edit can never be forgotten
const templateFiles = ['element.tsx', 'fonts.ts', 'generate.ts'];

function readTakumiVersion() {
	const packagePath = findPackageJSON('takumi-js', import.meta.url);

	if (!packagePath) throw new Error('Could not find the installed takumi-js package');

	return (JSON.parse(readFileSync(packagePath, 'utf8')) as { version: string }).version;
}

function hashTemplate() {
	const hash = createHash('sha256').update(
		`${String(openGraphImageWidth)}x${String(openGraphImageHeight)}:takumi-js@${readTakumiVersion()}`,
	);

	for (const file of templateFiles) {
		hash.update(readFileSync(new URL(file, import.meta.url), 'utf8'));
	}

	return hash.digest('hex').slice(0, 8);
}

export const templateVersion = hashTemplate();
