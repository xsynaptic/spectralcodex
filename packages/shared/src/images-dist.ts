import { collectDistMatches } from '#dist-scan.ts';

const imageUrlTerminators = String.raw`\s"'&<>),`;

function isMapPayload(relativePath: string) {
	return /^api\/map\/.+\.json$/.test(relativePath);
}

function isImageSurface(relativePath: string) {
	return relativePath.endsWith('.html') || relativePath === 'rss.xml' || isMapPayload(relativePath);
}

export async function collectImagePaths(distPath: string, imageBaseUrl: string) {
	const baseUrl = imageBaseUrl
		.replace(/\/+$/, '')
		.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);
	const pagePattern = new RegExp(`${baseUrl}/([^${imageUrlTerminators}]+)`, 'g');
	const mapPattern = new RegExp(String.raw`([^\s",]+\.(?:jpg|webp)) \d+w`, 'g');

	return collectDistMatches(distPath, isImageSurface, (relativePath) =>
		isMapPayload(relativePath) ? mapPattern : pagePattern,
	);
}
