import type { CollectionEntry, CollectionKey, ReferenceDataEntry } from 'astro:content';

import { performance } from 'node:perf_hooks';
import * as R from 'remeda';

import type { Catalog } from '#lib/catalog/catalog-factory.ts';
import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

import { createCatalog } from '#lib/catalog/catalog-factory.ts';
import { getWordCount } from '#lib/catalog/catalog-word-count.ts';
import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { getPagesCollection } from '#lib/collections/pages/pages-data.ts';
import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { getRegionsCollection } from '#lib/collections/regions/regions-data.ts';
import { getSeriesCollection } from '#lib/collections/series/series-data.ts';
import { getThemesCollection } from '#lib/collections/themes/themes-data.ts';
import { getMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { getImageFeaturedId, getImageHeroId } from '#lib/image/image-featured.ts';
import { getPublicId } from '#lib/utils/collections.ts';
import { getDescription } from '#lib/utils/description.ts';
import { getContentUrl } from '#lib/utils/routing.ts';

// Find the common ancestor of a set of regions so there's only one in the catalog
async function getRegionPrimaryIdFunction() {
	const { regionsTree } = await getRegionsCollection();

	return function getRegionPrimaryId(regions: Array<ReferenceDataEntry<'regions'>> | undefined) {
		if (regions && regions.length > 0) {
			return regions.length > 1
				? regionsTree.commonAncestorOf(regions.map(({ id }) => id))
				: regions.at(0)?.id;
		}
		return;
	};
}

// Content links count
function getLinksExternalCount(entry: CollectionEntry<CollectionKey>): number {
	let linksExternalCount = 0;

	if ('links' in entry.data) {
		linksExternalCount += entry.data.links?.length ?? 0;
	}
	if (entry.body) {
		linksExternalCount += (entry.body.match(/\[[^\]]*\]\(https?:\/\/[^)]+\)/g) ?? []).length;
	}
	return linksExternalCount;
}

// Content backlinks; discovered from the <Link id="..."> MDX component in body content
const backlinkLinkPattern = /<Link id="([^"]+)"/g;

function generateContentBacklinksFromMdxComponents(
	entry: CollectionEntry<CollectionKey>,
	catalogItemsById: Map<string, CatalogItem>,
) {
	if (!entry.body?.includes('<Link ')) return;

	for (const [, backlinkId] of entry.body.matchAll(backlinkLinkPattern)) {
		// Skip self-links and invalid backlinks
		if (!backlinkId || backlinkId === entry.id) continue;

		const backlinkSet = catalogItemsById.get(backlinkId)?.backlinks;

		if (backlinkSet) backlinkSet.add(entry.id);
	}
}

// This function does all the heavy lifting and should only run once
async function buildCatalogItems(): Promise<Array<CatalogItem>> {
	const startTime = performance.now();

	const catalogItemsById = new Map<string, CatalogItem>();

	const { entries: locations } = await getLocationsCollection();
	const { entries: pages } = await getPagesCollection();
	const { entries: posts } = await getPostsCollection();
	const { entries: regions } = await getRegionsCollection();
	const { entries: series } = await getSeriesCollection();
	const { entries: themes } = await getThemesCollection();

	// Regions require some special handling; this will calculate a common ancestor if necessary
	const getRegionPrimaryId = await getRegionPrimaryIdFunction();

	// Note: name collisions between all these collections is prohibited and will throw an error
	for (const collection of [pages, posts, locations, regions, themes, series]) {
		for (const entry of collection) {
			if (catalogItemsById.has(entry.id)) {
				throw new Error(
					`[Catalog] Duplicate ID found for "${entry.id}" across different collections!`,
				);
			}

			const titleMultilingual = getMultilingualContent({
				data: entry.data,
				prop: 'title',
			})?.primary;
			const regions = 'regions' in entry.data ? entry.data.regions : undefined;

			catalogItemsById.set(entry.id, {
				collection: entry.collection,
				id: entry.id,
				title: entry.data.title,
				titleMultilingual,
				description: getDescription(entry),
				url: getContentUrl(entry.collection, getPublicId(entry)),
				imageId:
					'imageFeatured' in entry.data
						? getImageFeaturedId({ imageFeatured: entry.data.imageFeatured })
						: undefined,
				imageHeroId:
					'imageFeatured' in entry.data
						? getImageHeroId({ imageFeatured: entry.data.imageFeatured })
						: undefined,
				regionPrimaryId: getRegionPrimaryId(regions),
				locationCount: '_locationCount' in entry.data ? entry.data._locationCount : undefined,
				postCount: '_postCount' in entry.data ? entry.data._postCount : undefined,
				wordCount: await getWordCount(entry),
				linksExternalCount: getLinksExternalCount(entry),
				backlinks: new Set<string>(), // Populated below
				dateCreated: entry.data.dateCreated,
				dateUpdated: 'dateUpdated' in entry.data ? entry.data.dateUpdated : undefined,
				dateRecorded:
					'dateRecorded' in entry.data && entry.data.dateRecorded
						? entry.data.dateRecorded
						: undefined,
				entryQuality: entry.data.entryQuality,
			});
		}
	}

	// Now run through everything again and generate backlinks from <Link> components
	for (const collection of [pages, posts, locations, regions, themes, series]) {
		for (const entry of collection) {
			generateContentBacklinksFromMdxComponents(entry, catalogItemsById);
		}
	}

	// Aggregate word count from series items
	for (const entry of series) {
		const seriesCatalogItem = catalogItemsById.get(entry.id);

		if (seriesCatalogItem) {
			seriesCatalogItem.wordCount = R.pipe(
				entry.data.seriesItems ?? [],
				R.map((seriesItem) => catalogItemsById.get(seriesItem)?.wordCount ?? 0),
				R.sum,
				Number,
			);
		}
	}

	const endTime = performance.now();

	console.log(`[Catalog] Generated in ${(endTime - startTime).toFixed(5)}ms`);

	return [...catalogItemsById.values()];
}

let catalogInstance: Promise<Catalog> | undefined;

async function loadCatalog(): Promise<Catalog> {
	const items = await buildCatalogItems();
	return createCatalog(items);
}

export async function getCatalog(): Promise<Catalog> {
	if (!catalogInstance) {
		catalogInstance = loadCatalog();
	}
	return catalogInstance;
}
