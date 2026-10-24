import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const imageUrlTerminators = String.raw`\s"'&<>),`;

function isMapPayload(relativePath: string) {
	return /^api\/map\/.+\.json$/.test(relativePath);
}

function isImageSurface(relativePath: string) {
	return relativePath.endsWith('.html') || relativePath === 'rss.xml' || isMapPayload(relativePath);
}

export async function collectDistMatches(
	distPath: string,
	getPattern: (relativePath: string) => RegExp,
) {
	const relativePaths = await readdir(distPath, { recursive: true });
	const matches = new Set<string>();

	for (const relativePath of relativePaths) {
		const surfacePath = relativePath.split(path.sep).join('/');

		if (!isImageSurface(surfacePath)) continue;

		const text = await readFile(path.join(distPath, relativePath), 'utf8');
		const surfaceMatches = text.matchAll(getPattern(surfacePath));

		for (const match of surfaceMatches) {
			if (match[1]) matches.add(match[1]);
		}
	}

	return matches;
}

export async function collectImagePaths(distPath: string, imageBaseUrl: string) {
	const baseUrl = imageBaseUrl
		.replace(/\/+$/, '')
		.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);
	const pagePattern = new RegExp(`${baseUrl}/([^${imageUrlTerminators}]+)`, 'g');
	const mapPattern = new RegExp(String.raw`([^\s",]+\.(?:jpg|webp)) \d+w`, 'g');

	return collectDistMatches(distPath, (relativePath) =>
		isMapPayload(relativePath) ? mapPattern : pagePattern,
	);
}
