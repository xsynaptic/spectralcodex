import { ContentCollectionsEnum } from '@spectralcodex/shared/collections';
import { openGraphBasePath } from '@spectralcodex/shared/constants';
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
	toReferenceIds,
} from '../shared/data-store.js';
import { extractImageFeaturedIds } from '../shared/images.js';
import { buildChronologyImageIndex, getChronologyTitle } from './chronology.js';
import { getFallbackImageId, resolveFallbackImageId } from './fallback.js';

// Sensitive locations present override regions; fallback imagery must not leak the true region
export function resolveOgRegions(data: Record<string, unknown>): Array<string> {
	const override = z.object({ regions: z.unknown() }).safeParse(data.override);
	const overrideRegions = toReferenceIds(override.data?.regions);

	return overrideRegions.length > 0 ? overrideRegions : toReferenceIds(data.regions);
}

function getImageFeaturedData({
	entry,
	collection,
	regionParentMap,
	chronologyImageIndex,
}: {
	entry: DataStoreEntry;
	collection: string;
	regionParentMap?: RegionParentMap;
	chronologyImageIndex?: Map<string, string>;
}): { imageFeaturedId: string; isFallback: boolean } {
	const imageFeaturedId = extractImageFeaturedIds(entry.data)[0];

	if (imageFeaturedId) return { imageFeaturedId, isFallback: false };

	if (chronologyImageIndex && collection === ContentCollectionsEnum.Chronology) {
		const derivedImageId = chronologyImageIndex.get(getPublicId(entry).replace('/', '-'));

		if (derivedImageId) return { imageFeaturedId: derivedImageId, isFallback: false };
	}

	return {
		imageFeaturedId: getFallbackImageId({
			id: entry.id,
			collection,
			category: z.string().optional().parse(entry.data.category),
			regions: regionParentMap
				? getDataStoreRegionParentsById(
						collection === ContentCollectionsEnum.Regions
							? z.string().optional().parse(entry.data.parent)
							: resolveOgRegions(entry.data)[0],
						regionParentMap,
					)
				: undefined,
			themes: toReferenceIds(entry.data.themes),
		}),
		isFallback: true,
	};
}

// Keyed by the OG image filename Astro emits
export function buildIndexEntries(): Map<string, OpenGraphContentEntry> {
	const indexes: Array<{ suffix: string; title: string; isFallback?: boolean }> = [
		{ suffix: ContentCollectionsEnum.Chronology, title: 'Chronology', isFallback: true },
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

const TitleOverrideSchema = z
	.object({
		title: z.string().optional(),
		title_zh: z.string().optional(),
		title_ja: z.string().optional(),
		title_th: z.string().optional(),
	})
	.optional();

type TitleOverride = z.infer<typeof TitleOverrideSchema>;

function parseTitleOverride(collection: string, data: Record<string, unknown>): TitleOverride {
	if (collection !== ContentCollectionsEnum.Locations) return undefined;

	return TitleOverrideSchema.parse(data.override);
}

// `undefined` marks an entry that gets no OG image at all
function resolveEntryTitle({
	collection,
	id,
	data,
	override,
}: {
	collection: string;
	id: string;
	data: Record<string, unknown>;
	override: TitleOverride;
}): string | undefined {
	if (collection === ContentCollectionsEnum.Chronology) return getChronologyTitle(id);

	const title = override?.title ?? z.string().optional().parse(data.title);

	if (!title) return undefined;

	// A resource without `showPage` has no page, so no OG image
	if (collection === ContentCollectionsEnum.Resources && !data.showPage) return undefined;

	return title;
}

function parseOptionalString(value: unknown) {
	return z.string().optional().parse(value);
}

function getMultilingualTitles(data: Record<string, unknown>, override: TitleOverride) {
	return {
		titleZh: parseOptionalString(override?.title_zh ?? data.title_zh),
		titleJa: parseOptionalString(override?.title_ja ?? data.title_ja),
		titleTh: parseOptionalString(override?.title_th ?? data.title_th),
	};
}

// Keyed by the OG image filename, same as the index entries
function buildDataStoreEntries(dataStorePath: string): {
	entries: Map<string, OpenGraphContentEntry>;
	chronologyImageIndex: Map<string, string>;
} {
	const { collections, regionParentMap } = loadDataStore(dataStorePath);

	const chronologyImageIndex = buildChronologyImageIndex(collections);

	const entries = new Map<string, OpenGraphContentEntry>();

	for (const collection of Object.values(ContentCollectionsEnum)) {
		const collectionEntries = getDataStoreCollection(collections, [collection]);

		for (const entry of collectionEntries) {
			if (!entry.digest) continue;

			const id = getPublicId(entry).replace('/', '-');
			const override = parseTitleOverride(collection, entry.data);
			const title = resolveEntryTitle({ collection, id, data: entry.data, override });

			if (title === undefined) continue;

			const imageFeaturedData = getImageFeaturedData({
				entry,
				collection,
				regionParentMap,
				chronologyImageIndex,
			});

			entries.set(id, {
				collection,
				id,
				digest: entry.digest,
				title: stripDiacritics(title),
				...getMultilingualTitles(entry.data, override),
				...imageFeaturedData,
			});
		}
	}

	return { entries, chronologyImageIndex };
}

export function extractBuiltFilenames(distPath: string): Set<string> {
	const ogImageRegex = /property="og:image" content="([^"]+)"/g;
	const ogPathSegment = `/${openGraphBasePath}/`;
	const filenames = new Set<string>();

	function walkDir(dir: string): void {
		const dirents = readdirSync(dir, { withFileTypes: true });

		for (const dirent of dirents) {
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

// Resolution order: data store, then static index entries, then synthesized chronology ids
export function resolveEntry({
	filename,
	dataStoreEntries,
	indexEntries,
	chronologyImageIndex,
}: {
	filename: string;
	dataStoreEntries: Map<string, OpenGraphContentEntry>;
	indexEntries: Map<string, OpenGraphContentEntry>;
	chronologyImageIndex: Map<string, string>;
}): OpenGraphContentEntry | undefined {
	const fromDataStore = dataStoreEntries.get(filename);

	if (fromDataStore) return fromDataStore;

	const fromIndex = indexEntries.get(filename);

	if (fromIndex) return fromIndex;

	if (/^\d{4}(?:-\d{2})?$/.test(filename)) {
		const derivedImageId = chronologyImageIndex.get(filename);

		return {
			id: filename,
			collection: ContentCollectionsEnum.Chronology,
			digest: `chronology-${filename}`,
			title: getChronologyTitle(filename),
			imageFeaturedId:
				derivedImageId ??
				getFallbackImageId({
					id: filename,
					collection: ContentCollectionsEnum.Chronology,
				}),
			isFallback: !derivedImageId,
		};
	}

	return undefined;
}

// Built HTML is the source of truth for which OG images should exist
export function getBuiltEntries({
	dataStorePath,
	distPath,
}: {
	dataStorePath: string;
	distPath: string;
}): { entries: Array<OpenGraphContentEntry>; unresolved: Array<string> } {
	const { entries: dataStoreEntries, chronologyImageIndex } = buildDataStoreEntries(dataStorePath);
	const indexEntries = buildIndexEntries();
	const distFilenames = extractBuiltFilenames(distPath);

	const entries: Array<OpenGraphContentEntry> = [];
	const unresolved: Array<string> = [];

	for (const filename of distFilenames) {
		const entry = resolveEntry({ filename, dataStoreEntries, indexEntries, chronologyImageIndex });

		if (entry) {
			entries.push(entry);
		} else {
			unresolved.push(filename);
		}
	}

	return { entries, unresolved };
}
