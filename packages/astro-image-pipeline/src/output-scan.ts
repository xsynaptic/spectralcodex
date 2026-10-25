import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { imageNamePatternSource, imageNameTerminators, parseImageName } from '#image-name.ts';

export interface ImageScanOptions {
	names?: ReadonlyArray<string>;
	urls?: ReadonlyArray<string>;
}

export async function collectOutputMatches(
	outputPath: string,
	isSurface: (relativePath: string) => boolean,
	getPattern: (relativePath: string) => RegExp,
) {
	const relativePaths = await readdir(outputPath, { recursive: true });
	const matches = new Set<string>();

	for (const relativePath of relativePaths) {
		const surfacePath = relativePath.split(path.sep).join('/');

		if (!isSurface(surfacePath)) continue;

		const text = await readFile(path.join(outputPath, relativePath), 'utf8');
		const surfaceMatches = text.matchAll(getPattern(surfacePath));

		for (const match of surfaceMatches) {
			if (match[1]) matches.add(match[1]);
		}
	}

	return matches;
}

function createGlobMatcher(globs: ReadonlyArray<string>) {
	return (relativePath: string) => globs.some((glob) => path.matchesGlob(relativePath, glob));
}

function escapePattern(text: string) {
	return text.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);
}

export async function scanImageNames(
	outputPath: string,
	{
		baseUrl,
		names: nameGlobs = [],
		urls: urlGlobs = ['**/*.html'],
	}: ImageScanOptions & { baseUrl: string },
) {
	const base = escapePattern(baseUrl.replace(/\/+$/, ''));
	const urlPattern = new RegExp(`${base}/([^${imageNameTerminators}]+)`, 'g');
	const namePattern = new RegExp(`(${imageNamePatternSource})(?![^${imageNameTerminators}])`, 'g');
	const [urlMatches, nameMatches] = await Promise.all([
		collectOutputMatches(outputPath, createGlobMatcher(urlGlobs), () => urlPattern),
		collectOutputMatches(outputPath, createGlobMatcher(nameGlobs), () => namePattern),
	]);
	const names = new Set<string>();
	const invalid: Array<string> = [];

	for (const match of urlMatches.union(nameMatches)) {
		if (parseImageName(match)) {
			names.add(match);
		} else {
			invalid.push(match);
		}
	}

	return { invalid: invalid.toSorted((first, second) => first.localeCompare(second)), names };
}
