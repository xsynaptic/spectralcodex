import type { CollectionEntry, CollectionKey, ReferenceDataEntry } from 'astro:content';

import { stripTags, transformMarkdown } from '@xsynaptic/unified-tools';
import { countWords } from 'alfaaz';
import { performance } from 'node:perf_hooks';
import * as R from 'remeda';

import type { ContentMetadataItem } from '#types/metadata.ts';

import { MDX_COMPONENTS_TO_STRIP, SITE_YEAR_FOUNDED } from '#constants.ts';
import { getEphemeraCollection } from '#lib/collections/ephemera/data.ts';
import { getLocationsCollection } from '#lib/collections/locations/data.ts';
import { getPagesCollection } from '#lib/collections/pages/data.ts';
import { getPostsCollection } from '#lib/collections/posts/data.ts';
import { getRegionsCollection } from '#lib/collections/regions/data.ts';
import { getRegionCommonAncestorFunction } from '#lib/collections/regions/utils.ts';
import { getSeriesCollection } from '#lib/collections/series/data.ts';
import { getThemesCollection } from '#lib/collections/themes/data.ts';
import { getImageSetPrimaryImage } from '#lib/image/image-set.ts';
import { validateLocations } from '#lib/metadata/metadata-validate.ts';
import { parseContentDate } from '#lib/utils/date.ts';
import { getContentUrl } from '#lib/utils/routing.ts';
import { stripMdxComponents } from '#lib/utils/text.ts';

// Simple in-memory cache
const contentMetadataMap = new Map<string, ContentMetadataItem>();

// Note: we could get all featured images but prefer to just grab one for simplicity
function getContentMetadataImageId(entry: CollectionEntry<CollectionKey>): string | undefined {
	if ('imageSet' in entry.data) {
		const featuredImage = getImageSetPrimaryImage({
			imageSet: entry.data.imageSet,
			shuffle: false,
		});

		return featuredImage?.id;
	}
	return 'imageFeatured' in entry.data ? entry.data.imageFeatured : undefined;
}

// Generate a word count from a crude rendering of the body without transforming MDX
// This method won't work if your MDX components introduce text from outside sources
// But for this project MDX mainly adds decorative classes so we can get away with this
function getContentMetadataWordCount(entry: CollectionEntry<CollectionKey>): number | undefined {
	if (['series'].includes(entry.collection)) {
		return undefined; // We will set this after individual posts and locations have a word count
	}
	if (entry.body && entry.body.length > 0) {
		return R.pipe(
			entry.body,
			(body) => stripMdxComponents(body, MDX_COMPONENTS_TO_STRIP),
			transformMarkdown,
			stripTags,
			countWords,
		);
	}
	return undefined;
}

// Find the common ancestor of a set of regions so there's only one in the content metadata index
async function getRegionPrimaryIdFunction() {
	const getRegionCommonAncestor = await getRegionCommonAncestorFunction();

	return function getRegionPrimaryId(regions: Array<ReferenceDataEntry<'regions'>> | undefined) {
		if (regions && regions.length > 0) {
			return regions.length > 1
				? getRegionCommonAncestor(regions.map(({ id }) => id))
				: regions.at(0)?.id;
		}
		return;
	};
}

// This function does all the heavy lifting and should only run once
async function populateContentMetadataIndex(): Promise<Map<string, ContentMetadataItem>> {
	const startTime = performance.now();

	const { ephemera } = await getEphemeraCollection();
	const { locations } = await getLocationsCollection();
	const { pages } = await getPagesCollection();
	const { posts } = await getPostsCollection();
	const { regions } = await getRegionsCollection();
	const { series } = await getSeriesCollection();
	const { themes } = await getThemesCollection();

	// Regions require some special handling; this will calculate a common ancestor if necessary
	const getRegionPrimaryId = await getRegionPrimaryIdFunction();

	// Check some additional location properties in development
	// Note: due to the operation of the new Content Layer API this is now throwing too many errors
	if (import.meta.env.DEV) {
		validateLocations(locations);
	}

	// Note: name collisions between all these collections is prohibited and will throw an error
	for (const collection of [pages, posts, ephemera, locations, regions, themes, series]) {
		for (const entry of collection) {
			if (contentMetadataMap.has(entry.id)) {
				throw new Error(`Duplicate ID found for "${entry.id}" across different collections!`);
			}

			// Here we allow for location data to have overrides; this is used to obscure sensitive sites
			let id = entry.id;
			let title = entry.data.title;
			let titleAlt = 'titleAlt' in entry.data ? entry.data.titleAlt : undefined;
			let regions = 'regions' in entry.data ? entry.data.regions : undefined;

			if ('override' in entry.data) {
				id = entry.data.override?.slug ?? id;
				title = entry.data.override?.title ?? title;
				titleAlt = entry.data.override?.titleAlt ?? titleAlt;
				regions = entry.data.override?.regions ?? regions;
			}

			contentMetadataMap.set(entry.id, {
				collection: entry.collection,
				id,
				title,
				titleAlt,
				description: entry.data.description,
				date:
					parseContentDate(entry.data.dateUpdated) ??
					parseContentDate(entry.data.dateCreated) ??
					new Date(String(SITE_YEAR_FOUNDED)),
				url: getContentUrl(entry.collection, entry.id),
				imageId: getContentMetadataImageId(entry),
				regionPrimaryId: getRegionPrimaryId(regions),
				locationCount: 'locationCount' in entry.data ? entry.data.locationCount : undefined,
				postCount: 'postCount' in entry.data ? entry.data.postCount : undefined,
				wordCount: getContentMetadataWordCount(entry), // Expensive!!!
				backlinks: new Set<string>(), // Populated below
				entryQuality: entry.data.entryQuality,
			});
		}
	}

	// Now run through everything again and save backlinks; a surprisingly efficient process
	for (const collection of [pages, posts, ephemera, locations, regions, themes, series]) {
		for (const entry of collection) {
			if (entry.body?.includes('<Link ')) {
				const matches = [...entry.body.matchAll(/<Link id="([^"]+)"/g)];

				for (const [, backlinkId] of matches) {
					if (!backlinkId) continue;

					const backlinkSet = contentMetadataMap.get(backlinkId)?.backlinks;

					if (backlinkSet) backlinkSet.add(entry.id);
				}
			}
		}
	}

	// Aggregate word count from series items
	for (const entry of series) {
		const seriesMetadata = contentMetadataMap.get(entry.id);

		if (seriesMetadata) {
			const wordCount = R.pipe(
				entry.data.seriesItems ?? [],
				R.map((seriesItem) => contentMetadataMap.get(seriesItem)?.wordCount ?? 0),
				R.sum,
			);

			seriesMetadata.wordCount = Number(wordCount);
		}
	}

	const endTime = performance.now();

	console.log(`[Metadata Index] Generated in ${Number(endTime - startTime).toFixed(5)}ms`);

	return contentMetadataMap;
}

// Initialize the content metadata index and return on demand
let contentMetadataIndex: ReturnType<typeof populateContentMetadataIndex> | undefined;

export async function getContentMetadataIndex() {
	if (!contentMetadataIndex) {
		contentMetadataIndex = populateContentMetadataIndex();
	}
	return contentMetadataIndex;
}
