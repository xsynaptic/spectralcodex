import type { ContentEntry } from '@xsynaptic/astro-scripts';

import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { isImageSource } from '@xsynaptic/astro-image-pipeline/names';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { findComponentTags, getTagProp } from '#shared/component-tags.ts';

export function listMediaImages(
	mediaPath: string,
	options?: { ignore?: ReadonlyArray<string> },
): Set<string> {
	const files = new Set<string>();
	const ignore = options?.ignore ?? [];

	function processDirectory(dirPath: string, prefix = '') {
		const entries = readdirSync(dirPath);

		for (const entry of entries) {
			const fullPath = path.join(dirPath, entry);
			const relativePath = prefix ? `${prefix}/${entry}` : entry;
			const stat = statSync(fullPath);

			if (stat.isDirectory()) {
				processDirectory(fullPath, relativePath);
			} else if (isImageSource(entry)) {
				if (ignore.some((ignored) => relativePath.startsWith(ignored))) continue;
				files.add(relativePath);
			}
		}
	}

	processDirectory(mediaPath);

	return files;
}

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
