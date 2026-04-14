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
export const GET: APIRoute = async () => {
	const index = await getContentMetadataIndex();

	const entries = [...index.values()]
		.filter(({ url }) => shouldIncludeUrl(url))
		.map(({ url, title }) => ({ url, title }));

	return Response.json(entries, {
		headers: { 'Content-Type': 'application/json' },
	});
};
