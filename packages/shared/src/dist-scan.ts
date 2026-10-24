import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export async function collectDistMatches(
	distPath: string,
	isSurface: (relativePath: string) => boolean,
	getPattern: (relativePath: string) => RegExp,
) {
	const relativePaths = await readdir(distPath, { recursive: true });
	const matches = new Set<string>();

	for (const relativePath of relativePaths) {
		const surfacePath = relativePath.split(path.sep).join('/');

		if (!isSurface(surfacePath)) continue;

		const text = await readFile(path.join(distPath, relativePath), 'utf8');
		const surfaceMatches = text.matchAll(getPattern(surfacePath));

		for (const match of surfaceMatches) {
			if (match[1]) matches.add(match[1]);
		}
	}

	return matches;
}
