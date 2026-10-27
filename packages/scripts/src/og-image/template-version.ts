import { openGraphImageHeight, openGraphImageWidth } from '@spectralcodex/shared/open-graph';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Everything that decides a card's pixels; hashed so a template edit can never be forgotten
const templateFiles = ['element.tsx', 'fonts.ts', 'generate.ts'];

function readTakumiVersion() {
	let directory = path.dirname(fileURLToPath(import.meta.resolve('takumi-js')));

	while (directory !== path.dirname(directory)) {
		const packagePath = path.join(directory, 'package.json');

		if (existsSync(packagePath)) {
			const { name, version } = JSON.parse(readFileSync(packagePath, 'utf8')) as {
				name?: string;
				version?: string;
			};

			if (name === 'takumi-js' && version) return version;
		}

		directory = path.dirname(directory);
	}

	throw new Error('Could not read the installed takumi-js version');
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
