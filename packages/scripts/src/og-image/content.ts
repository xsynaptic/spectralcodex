import type { ImageFeatured } from '@spectralcodex/shared/schemas';

import { OPEN_GRAPH_BASE_PATH } from '@spectralcodex/shared/constants';
import {
	ContentCollectionsEnum,
	ImageFeaturedSchema,
	RegionsSchema,
	ThemesSchema,
} from '@spectralcodex/shared/schemas';
import { stripDiacritics } from '@spectralcodex/shared/text';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import type { DataStoreEntry, RegionParentMap } from '../shared/data-store.js';
import type { OpenGraphContentEntry } from './types.js';

import {
	getDataStoreCollection,
	getDataStoreRegionParentsById,
	getPublicId,
	loadDataStore,
} from '../shared/data-store.js';
import { getFallbackImageId, resolveFallbackImageId } from './fallback.js';

/**
 * Featured image handling
 */
function getImageFeaturedId(imageFeatured: ImageFeatured | undefined): string | undefined {
	if (!imageFeatured) return undefined;

	if (typeof imageFeatured === 'string') return imageFeatured;

	const firstItem = imageFeatured[0];

	if (!firstItem) return undefined;

	return typeof firstItem === 'object' && 'id' in firstItem ? firstItem.id : firstItem;
}

function getImageFeaturedData({
	entry,
	collection,
	regionParentMap,
}: {
	entry: DataStoreEntry;
	collection: string;
	regionParentMap?: RegionParentMap;
}): { imageFeaturedId: string; isFallback: boolean } {
	const imageFeatured = ImageFeaturedSchema.optional().parse(entry.data.imageFeatured);

	const imageFeaturedId = getImageFeaturedId(imageFeatured);

	if (imageFeaturedId) return { imageFeaturedId, isFallback: false };

	return {
		imageFeaturedId: getFallbackImageId({
			id: entry.id,
			collection,
			category: z.string().optional().parse(entry.data.category),
			regions: regionParentMap
				? getDataStoreRegionParentsById(
						collection === ContentCollectionsEnum.Regions
							? z.string().optional().parse(entry.data.parent)
							: RegionsSchema.optional().parse(entry.data.regions)?.[0],
						regionParentMap,
					)
				: undefined,
			themes: ThemesSchema.optional().parse(entry.data.themes),
		}),
		isFallback: true,
	};
}

/**
 * Archives title format: "Archives: March 2024" or "Archives: 2024"
 */
const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' });

function getArchivesTitle(id: string): string {
	const year = Number(id.split('-', 1)[0]);
	const monthPart = id.split('-', 2)[1];

	if (!monthPart) return `Archives: ${String(year)}`;

	const month = Number(monthPart);

	return `Archives: ${monthFormatter.format(new Date(year, month - 1))} ${String(year)}`;
}

/**
 * Static metadata for index pages (homepage, not-found, per-collection
 * landings), keyed by the OG image filename Astro emits.
 */
function buildIndexEntries(): Map<string, OpenGraphContentEntry> {
	const indexes: Array<{ suffix: string; title: string; isFallback?: boolean }> = [
		{ suffix: ContentCollectionsEnum.Archives, title: 'Archives', isFallback: true },
		{ suffix: ContentCollectionsEnum.Notes, title: 'Notes', isFallback: true },
		{ suffix: ContentCollectionsEnum.Locations, title: 'Locations', isFallback: true },
		{ suffix: ContentCollectionsEnum.Posts, title: 'Posts', isFallback: true },
		{ suffix: ContentCollectionsEnum.Regions, title: 'Regions' },
		{ suffix: ContentCollectionsEnum.Resources, title: 'Resources', isFallback: true },
		{ suffix: ContentCollectionsEnum.Series, title: 'Series', isFallback: true },
		{ suffix: ContentCollectionsEnum.Themes, title: 'Themes', isFallback: true },
		{ suffix: 'homepage', title: '' }, // No duplicate branding
		{ suffix: 'not-found', title: '404: Not Found', isFallback: true },
	];

	const entries = new Map<string, OpenGraphContentEntry>();

	for (const { suffix, title, isFallback } of indexes) {
		const id = `index-${suffix}`;

		entries.set(id, {
			id,
			collection: 'index',
			digest: id,
			title,
			imageFeaturedId: resolveFallbackImageId(suffix, id),
			isFallback: isFallback ?? false,
		});
	}

	return entries;
}

/**
 * Build a map from OG image filename (entry id) to fully-resolved entry derived from the data store
 */
function buildDataStoreEntries(dataStorePath: string): Map<string, OpenGraphContentEntry> {
	const { collections, regionParentMap } = loadDataStore(dataStorePath);

	const entries = new Map<string, OpenGraphContentEntry>();

	for (const collection of Object.values(ContentCollectionsEnum)) {
		const collectionEntries = getDataStoreCollection(collections, [collection]);

		for (const entry of collectionEntries) {
			if (!entry.digest) continue;

			const override =
				collection === ContentCollectionsEnum.Locations
					? z
							.object({
								title: z.string().optional(),
								title_zh: z.string().optional(),
								title_ja: z.string().optional(),
								title_th: z.string().optional(),
							})
							.optional()
							.parse(entry.data.override)
					: undefined;

			const id = getPublicId(entry).replace('/', '-');
			const titleRaw = override?.title ?? z.string().optional().parse(entry.data.title);

			let title = titleRaw;

			if (collection === ContentCollectionsEnum.Archives) {
				title = getArchivesTitle(id);
			} else if (collection === ContentCollectionsEnum.Resources) {
				if (!('showPage' in entry.data) || !entry.data.showPage || !title) {
					continue;
				}
			} else if (!title) {
				continue;
			}

			const imageFeaturedData = getImageFeaturedData({ entry, collection, regionParentMap });

			entries.set(id, {
				collection,
				id,
				digest: entry.digest,
				title: stripDiacritics(title),
				titleZh: z
					.string()
					.optional()
					.parse(override?.title_zh ?? entry.data.title_zh),
				titleJa: z
					.string()
					.optional()
					.parse(override?.title_ja ?? entry.data.title_ja),
				titleTh: z
					.string()
					.optional()
					.parse(override?.title_th ?? entry.data.title_th),
				...imageFeaturedData,
			});
		}
	}

	return entries;
}

/**
 * Walk built HTML files and extract the set of OG image filenames referenced
 */
function extractBuiltFilenames(distPath: string): Set<string> {
	const ogImageRegex = /property="og:image" content="([^"]+)"/g;
	const ogPathSegment = `/${OPEN_GRAPH_BASE_PATH}/`;
	const filenames = new Set<string>();

	function walkDir(dir: string): void {
		for (const dirent of readdirSync(dir, { withFileTypes: true })) {
			const fullPath = path.join(dir, dirent.name);

			if (dirent.isDirectory()) {
				walkDir(fullPath);
				continue;
			}

			if (!dirent.isFile() || !dirent.name.endsWith('.html')) continue;

			const content = readFileSync(fullPath, 'utf8');

			ogImageRegex.lastIndex = 0;

			let match: RegExpExecArray | null;

			while ((match = ogImageRegex.exec(content)) !== null) {
				const url = match[1] ?? '';
				const idx = url.indexOf(ogPathSegment);

				if (idx === -1) continue;

				const filename = url.slice(idx + ogPathSegment.length).replace(/\.[^.]+$/, '');

				if (filename) filenames.add(filename);
			}
		}
	}

	walkDir(distPath);

	return filenames;
}

/**
 * Resolve a filename emitted by Astro to a full OG entry in this order:
 * 1) data-store.json
 * 2) static index entries
 * 3) synthesize archive IDs for any remaining `YYYY` or `YYYY-MM` pattern
 */
function resolveEntry({
	filename,
	dataStoreEntries,
	indexEntries,
}: {
	filename: string;
	dataStoreEntries: Map<string, OpenGraphContentEntry>;
	indexEntries: Map<string, OpenGraphContentEntry>;
}): OpenGraphContentEntry | undefined {
	const fromDataStore = dataStoreEntries.get(filename);

	if (fromDataStore) return fromDataStore;

	const fromIndex = indexEntries.get(filename);

	if (fromIndex) return fromIndex;

	// Synthesize archive IDs for any remaining `YYYY` or `YYYY-MM` pattern
	if (/^\d{4}(?:-\d{2})?$/.test(filename)) {
		return {
			id: filename,
			collection: ContentCollectionsEnum.Archives,
			digest: `archives-${filename}`,
			title: getArchivesTitle(filename),
			imageFeaturedId: getFallbackImageId({
				id: filename,
				collection: ContentCollectionsEnum.Archives,
			}),
			isFallback: true,
		};
	}

	return undefined;
}

/**
 * Enumerate OG image entries by reading the rendered dist output
 * We treat built HTML as the source of truth for which OG images should exist
 */
export function getBuiltEntries({
	dataStorePath,
	distPath,
}: {
	dataStorePath: string;
	distPath: string;
}): { entries: Array<OpenGraphContentEntry>; unresolved: Array<string> } {
	const dataStoreEntries = buildDataStoreEntries(dataStorePath);
	const indexEntries = buildIndexEntries();
	const distFilenames = extractBuiltFilenames(distPath);

	const entries: Array<OpenGraphContentEntry> = [];
	const unresolved: Array<string> = [];

	for (const filename of distFilenames) {
		const entry = resolveEntry({ filename, dataStoreEntries, indexEntries });

		if (entry) {
			entries.push(entry);
		} else {
			unresolved.push(filename);
		}
	}

	return { entries, unresolved };
}
