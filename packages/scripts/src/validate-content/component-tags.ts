import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { ContentEntry } from '../shared/astro-content.js';

export interface ComponentTag {
	lineNumber: number;
	name: string;
	props: string;
}

const componentTagRegex = /<([A-Z]\w*)((?:\s[^>]*?)?)\/?>/g;

// Line numbers are body-relative; a caller adds getBodyLineOffset to point at the file
export function findComponentTags(body: string, names: ReadonlyArray<string>) {
	const tags: Array<ComponentTag> = [];

	for (const match of body.matchAll(componentTagRegex)) {
		const name = match[1];

		if (!name || !names.includes(name)) continue;

		tags.push({
			lineNumber: body.slice(0, match.index).split('\n').length,
			name,
			props: match[2] ?? '',
		});
	}

	return tags;
}

// Anchored on a boundary so `data-id="x"` is not read as the `id` prop
export function getTagProp({ props }: ComponentTag, name: string) {
	return new RegExp(String.raw`(?:^|\s)${name}=["']([^"']+)["']`).exec(props)?.[1];
}

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
