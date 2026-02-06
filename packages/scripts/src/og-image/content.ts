import type { ImageFeatured } from '@spectralcodex/shared/schemas';

import {
	ImageFeaturedSchema,
	RegionsSchema,
	ThemesSchema,
	ContentCollectionsEnum,
} from '@spectralcodex/shared/schemas';
import { z } from 'zod';

import type { OpenGraphMetadataItem } from './types.js';

import {
	getDataStoreCollection,
	getDataStoreRegionParentsById,
	loadDataStore,
} from '../content-utils/data-store.js';

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
	if (data.regions?.[1] === 'changhua') {
		return 'taiwan/changhua/changhua-city/changhua-confucius-temple-1.jpg';
	}
	if (data.regions?.[1] === 'chiayi') {
		return 'taiwan/chiayi/chiayi-east/chiayi-sun-shooting-tower-1.jpg';
	}
	if (data.regions?.[1] === 'hsinchu') {
		return 'taiwan/hsinchu/hsinchu-city/hsinchu-city-god-temple-1.jpg';
	}
	if (data.regions?.[1] === 'nantou') {
		return 'taiwan/nantou/caotun/caotun-cide-temple-1.jpg';
	}
	if (data.category === 'temple') {
		return 'taiwan/nantou/caotun/caotun-cide-temple-1.jpg';
	}
	if (data.themes?.includes('thailand-theaters')) {
		return 'thailand/bangkok/khlong-san/bangkok-hawaii-cinema-2.jpg';
	}
	if (data.regions?.[0] === 'canada') {
		return 'canada/british-columbia/alberni-clayoquot/ucluelet-shorepine-bog-trail-7.jpg';
	}
	if (data.regions?.[0] === 'thailand') {
		return 'thailand/bangkok/thon-buri/bangkok-dao-khanong-cinema-3.jpg';
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
	const { collections, regionParentMap } = loadDataStore(dataStorePath);

	const allEntries: Array<ContentEntry> = [];

	for (const collection of Object.values(ContentCollectionsEnum)) {
		const collectionEntries = getDataStoreCollection(collections, collection);

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
						regions: getDataStoreRegionParentsById(
							RegionsSchema.optional().parse(entry.data.regions)?.[0],
							regionParentMap,
						),
						themes: ThemesSchema.optional().parse(entry.data.themes),
					}),
				isFallback: imageFeaturedId === undefined,
			});
		}
	}

	return allEntries;
}
