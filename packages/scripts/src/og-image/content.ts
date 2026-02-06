import type { ImageFeatured } from '@spectralcodex/shared/schemas';

import {
	ImageFeaturedSchema,
	RegionsSchema,
	ThemesSchema,
	ContentCollectionsEnum,
} from '@spectralcodex/shared/schemas';
import { z } from 'zod';

import type { OpenGraphMetadataItem } from './types.js';

import { getCollection, loadDataStore } from '../content-utils/data-store.js';

interface ContentEntry extends OpenGraphMetadataItem {
	digest: string;
	imageFeaturedId: string;
}

/**
 * Returns a fallback image ID based on entry properties
 */
function getFallbackImageId(data: {
	collection: string;
	category?: string | undefined;
	regions?: Array<string> | undefined;
	themes?: Array<string> | undefined;
}): string {
	console.log(data.regions);
	console.log(data.themes);
	if (data.category === 'temple') {
		return 'taiwan/nantou/caotun/caotun-cide-temple-1.jpg';
	}
	return 'taiwan/nantou/caotun/caotun-cide-temple-2.jpg';
}

function getImageFeaturedId(imageFeatured: ImageFeatured | undefined): string | undefined {
	if (!imageFeatured) return undefined;

	if (Array.isArray(imageFeatured)) return getImageFeaturedId(imageFeatured[0]);

	return typeof imageFeatured === 'object' && 'id' in imageFeatured
		? imageFeatured.id
		: imageFeatured;
}

// Content entries are constructed with enough metadata to assign fallback images
export function getContentEntries(dataStorePath: string): Array<ContentEntry> {
	const { collections } = loadDataStore(dataStorePath);

	const allEntries: Array<ContentEntry> = [];

	for (const collection of Object.values(ContentCollectionsEnum)) {
		const collectionEntries = getCollection(collections, collection);

		for (const entry of collectionEntries) {
			const title = z.string().optional().parse(entry.data.title);
			const imageFeatured = ImageFeaturedSchema.optional().parse(entry.data.imageFeatured);
			const imageFeaturedId = getImageFeaturedId(imageFeatured);

			// Skip entries without digest
			if (!title || !entry.digest) continue;

			allEntries.push({
				collection,
				id: entry.id,
				digest: entry.digest,
				title,
				titleZh: z.string().optional().parse(entry.data.title_zh),
				titleJa: z.string().optional().parse(entry.data.title_ja),
				titleTh: z.string().optional().parse(entry.data.title_th),
				imageFeaturedId:
					imageFeaturedId ??
					getFallbackImageId({
						collection,
						category: z.string().optional().parse(entry.data.category),
						regions: RegionsSchema.optional().parse(entry.data.regions),
						themes: ThemesSchema.optional().parse(entry.data.themes),
					}),
				isFallback: imageFeaturedId === undefined,
			});
		}
	}

	return allEntries;
}
