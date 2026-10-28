import type { ContentEntry } from '@xsynaptic/astro-scripts';

import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { findComponentTags, getTagProp } from '@xsynaptic/astro-scripts';

function getFeaturedImageIds(frontmatter: Record<string, unknown>): Array<string> {
	const data = parseImageFeatured(frontmatter);

	if (!data) return [];

	if (typeof data === 'string') return [data];

	return data.map((item) => (typeof item === 'string' ? item : item.id));
}

function getBodyImageIds(body: string | undefined): Array<string> {
	if (!body) return [];

	return findComponentTags(body, ['Img'])
		.map((tag) => getTagProp(tag, 'src'))
		.filter((src) => src !== undefined);
}

export function getEntryImageIds(entry: Pick<ContentEntry, 'body' | 'data'>) {
	return { body: getBodyImageIds(entry.body), featured: getFeaturedImageIds(entry.data) };
}

export function parseImageFeatured(frontmatter: Record<string, unknown>) {
	const imageFeatured = frontmatter.imageFeatured;

	if (!imageFeatured) return;

	const parsed = ImageFeaturedSchema.safeParse(imageFeatured);

	if (!parsed.success) return;

	return parsed.data;
}
