import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { ContentEntry } from '#shared/astro-content.ts';

// `entry.body` drops the frontmatter, so a file line number needs its length added back
export function getBodyLineOffset(entry: ContentEntry, rootPath: string) {
	if (!entry.filePath || !entry.body) return 0;

	let source: string;

	// An entry with no file on disk (a test fixture) falls back to body-relative rather than throwing
	try {
		source = readFileSync(path.join(rootPath, entry.filePath), 'utf8');
	} catch {
		return 0;
	}

	const bodyIndex = source.indexOf(entry.body);

	if (bodyIndex === -1) return 0;

	return source.slice(0, bodyIndex).split('\n').length - 1;
}
