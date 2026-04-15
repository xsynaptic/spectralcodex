import type { APIRoute } from 'astro';

import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';

/**
 * Note: this should be kept in sync with the exclude prefixes in `astro.config.mjs`.
 */
const excludePrefixes = [
	'/objectives',
	'/planning',
	'/taiwan-theater-project',
	'/archives',
] as const;

function shouldIncludeUrl(pathname: string): boolean {
	const normalized = pathname.replace(/\/$/, '');

	if (/\/\d+$/.test(normalized)) return false;

	return !excludePrefixes.some(
		(prefix) => normalized === prefix || normalized.startsWith(prefix + '/'),
	);
}

/**
 * Generate JSON consumed by the "page not found" suggestions component
 */
export const GET: APIRoute = async ({ site }) => {
	if (!site) throw new Error('Astro `site` config is required for the content manifest.');

	const index = await getContentMetadataIndex();

	// Content manifest includes relative URLs so we need to normalize output before filtering
	const entries = [...index.values()]
		.map(({ url, title }) => ({ url: new URL(url, site).pathname, title }))
		.filter(({ url }) => shouldIncludeUrl(url));

	return Response.json(entries, {
		headers: { 'Content-Type': 'application/json' },
	});
};
