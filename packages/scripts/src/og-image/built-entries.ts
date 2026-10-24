import { ContentCollectionsEnum } from '@spectralcodex/shared/collections';
import { collectDistMatches } from '@spectralcodex/shared/dist-scan';
import { applyLocationOverride } from '@spectralcodex/shared/entries';
import { openGraphBasePath } from '@spectralcodex/shared/open-graph';

import type { OpenGraphContentEntry } from '#og-image/types.ts';
import type { ContentEntry } from '#shared/astro-content.ts';
import type { RegionParentMap } from '#shared/entries.ts';

import { buildChronologyImageIndex, getChronologyTitle } from '#og-image/chronology.ts';
import { toOpenGraphEntryItem } from '#og-image/content.ts';
import { getFallbackImageId, resolveFallbackImageId } from '#og-image/fallback.ts';
import { getCollectionEntries, withAstroContent } from '#shared/astro-content.ts';

export async function extractBuiltFilenames(distPath: string): Promise<Set<string>> {
	const ogPathSegment = `/${openGraphBasePath}/`;
	const urls = await collectDistMatches(
		distPath,
		(relativePath) => relativePath.endsWith('.html'),
		() => /property="og:image" content="([^"]+)"/g,
	);
	const filenames = new Set<string>();

	for (const url of urls) {
		const index = url.indexOf(ogPathSegment);

		if (index === -1) continue;

		const filename = url.slice(index + ogPathSegment.length).replace(/\.[^.]+$/, '');

		if (filename) filenames.add(filename);
	}

	return filenames;
}

export function resolveEntry({
	chronologyImageIndex,
	contentEntries,
	filename,
	indexEntries,
}: {
	chronologyImageIndex: Map<string, string>;
	contentEntries: Map<string, OpenGraphContentEntry>;
	filename: string;
	indexEntries: Map<string, OpenGraphContentEntry>;
}): OpenGraphContentEntry | undefined {
	const fromContent = contentEntries.get(filename);

	if (fromContent) return fromContent;

	const fromIndex = indexEntries.get(filename);

	if (fromIndex) return fromIndex;

	if (/^\d{4}(?:-\d{2})?$/.test(filename)) {
		const derivedImageId = chronologyImageIndex.get(filename);

		return {
			collection: ContentCollectionsEnum.Chronology,
			digest: `chronology-${filename}`,
			id: filename,
			imageFeaturedId:
				derivedImageId ??
				getFallbackImageId({
					collection: ContentCollectionsEnum.Chronology,
					id: filename,
				}),
			isFallback: !derivedImageId,
			title: getChronologyTitle(filename),
		};
	}

	return undefined;
}

// Built HTML is the source of truth for which OG images should exist
export async function getBuiltEntries({
	distPath,
}: {
	distPath: string;
}): Promise<{ entries: Array<OpenGraphContentEntry>; unresolved: Array<string> }> {
	const { chronologyImageIndex, entries: contentEntries } = await buildContentEntries();
	const indexEntries = buildIndexEntries();
	const distFilenames = await extractBuiltFilenames(distPath);

	const entries: Array<OpenGraphContentEntry> = [];
	const unresolved: Array<string> = [];

	for (const filename of distFilenames) {
		const entry = resolveEntry({ chronologyImageIndex, contentEntries, filename, indexEntries });

		if (entry) {
			entries.push(entry);
		} else {
			unresolved.push(filename);
		}
	}

	return { entries, unresolved };
}

// Keyed by the OG image filename, same as the index entries
async function buildContentEntries(): Promise<{
	chronologyImageIndex: Map<string, string>;
	entries: Map<string, OpenGraphContentEntry>;
}> {
	const collections = Object.values(ContentCollectionsEnum);

	const contentEntries = await withAstroContent((content) =>
		getCollectionEntries(content, collections),
	);

	const regionParentMap = buildRegionParentMap(contentEntries);
	const chronologyImageIndex = buildChronologyImageIndex(contentEntries);

	const entries = new Map<string, OpenGraphContentEntry>();

	// Collection by collection, so colliding ids resolve in a stable order
	for (const collection of collections) {
		for (const entry of contentEntries) {
			if (entry.collection !== collection) continue;
			if (!entry.digest) continue;

			const item = toOpenGraphEntryItem({
				chronologyImageIndex,
				collection,
				entry: { ...entry, data: applyLocationOverride(entry.data) },
				regionParentMap,
			});

			if (!item) continue;

			entries.set(item.id, { ...item, digest: String(entry.digest) });
		}
	}

	return { chronologyImageIndex, entries };
}
// Keyed by the OG image filename Astro emits
function buildIndexEntries(): Map<string, OpenGraphContentEntry> {
	const indexes: Array<{
		isFallback?: boolean;
		suffix: string;
		title: string;
		titleZh?: string;
	}> = [
		{ isFallback: true, suffix: ContentCollectionsEnum.Chronology, title: 'Chronology' },
		{ isFallback: true, suffix: ContentCollectionsEnum.Locations, title: 'Locations' },
		{ isFallback: true, suffix: ContentCollectionsEnum.Posts, title: 'Posts' },
		{ suffix: ContentCollectionsEnum.Regions, title: 'Regions' },
		{ isFallback: true, suffix: ContentCollectionsEnum.Resources, title: 'Resources' },
		{ isFallback: true, suffix: ContentCollectionsEnum.Series, title: 'Series' },
		{ isFallback: true, suffix: ContentCollectionsEnum.Themes, title: 'Themes' },
		{ suffix: 'atlas', title: 'Atlas', titleZh: '地圖集' },
		{ suffix: 'homepage', title: '' }, // No duplicate branding
		{ isFallback: true, suffix: 'not-found', title: '404: Not Found' },
	];

	const entries = new Map<string, OpenGraphContentEntry>();

	for (const { isFallback, suffix, title, titleZh } of indexes) {
		const id = `index-${suffix}`;

		entries.set(id, {
			collection: 'index',
			digest: [id, title, titleZh].join(':'),
			id,
			imageFeaturedId: resolveFallbackImageId(suffix, id),
			isFallback: isFallback ?? false,
			title,
			titleZh,
		});
	}

	return entries;
}

function buildRegionParentMap(entries: Array<ContentEntry>): RegionParentMap {
	return new Map(
		entries
			.filter((entry) => entry.collection === ContentCollectionsEnum.Regions)
			.map((entry) => [entry.id, entry.data.parent as string | undefined]),
	);
}
