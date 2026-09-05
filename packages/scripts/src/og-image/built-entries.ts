import { ContentCollectionsEnum } from '@spectralcodex/shared/collections';
import { openGraphBasePath } from '@spectralcodex/shared/constants';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { OpenGraphContentEntry } from '#og-image/types.ts';
import type { ContentEntry } from '#shared/astro-content.ts';
import type { RegionParentMap } from '#shared/entries.ts';

import { buildChronologyImageIndex } from '#og-image/chronology.ts';
import { resolveEntry, toOpenGraphEntryItem } from '#og-image/content.ts';
import { resolveFallbackImageId } from '#og-image/fallback.ts';
import { getCollectionEntries, withAstroContent } from '#shared/astro-content.ts';

// Keyed by the OG image filename Astro emits
function buildIndexEntries(): Map<string, OpenGraphContentEntry> {
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
function buildRegionParentMap(entries: Array<ContentEntry>): RegionParentMap {
	return new Map(
		entries
			.filter((entry) => entry.collection === ContentCollectionsEnum.Regions)
			.map((entry) => [entry.id, entry.data.parent as string | undefined]),
	);
}

// Keyed by the OG image filename, same as the index entries
async function buildContentEntries(): Promise<{
	entries: Map<string, OpenGraphContentEntry>;
	chronologyImageIndex: Map<string, string>;
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
				entry,
				collection,
				regionParentMap,
				chronologyImageIndex,
			});

			if (!item) continue;

			entries.set(item.id, { ...item, digest: String(entry.digest) });
		}
	}

	return { entries, chronologyImageIndex };
}
export function extractBuiltFilenames(distPath: string): Set<string> {
	const ogImageRegex = /property="og:image" content="([^"]+)"/g;
	const ogPathSegment = `/${openGraphBasePath}/`;
	const filenames = new Set<string>();

	function collectFromHtml(filePath: string): void {
		const content = readFileSync(filePath, 'utf8');

		for (const match of content.matchAll(ogImageRegex)) {
			const url = match[1] ?? '';
			const index = url.indexOf(ogPathSegment);

			if (index === -1) continue;

			const filename = url.slice(index + ogPathSegment.length).replace(/\.[^.]+$/, '');

			if (filename) filenames.add(filename);
		}
	}

	function walkDir(dir: string): void {
		const dirents = readdirSync(dir, { withFileTypes: true });

		for (const dirent of dirents) {
			const fullPath = path.join(dir, dirent.name);

			if (dirent.isDirectory()) {
				walkDir(fullPath);
				continue;
			}

			if (dirent.isFile() && dirent.name.endsWith('.html')) collectFromHtml(fullPath);
		}
	}

	walkDir(distPath);

	return filenames;
}

// Built HTML is the source of truth for which OG images should exist
export async function getBuiltEntries({
	distPath,
}: {
	distPath: string;
}): Promise<{ entries: Array<OpenGraphContentEntry>; unresolved: Array<string> }> {
	const { entries: contentEntries, chronologyImageIndex } = await buildContentEntries();
	const indexEntries = buildIndexEntries();
	const distFilenames = extractBuiltFilenames(distPath);

	const entries: Array<OpenGraphContentEntry> = [];
	const unresolved: Array<string> = [];

	for (const filename of distFilenames) {
		const entry = resolveEntry({ filename, contentEntries, indexEntries, chronologyImageIndex });

		if (entry) {
			entries.push(entry);
		} else {
			unresolved.push(filename);
		}
	}

	return { entries, unresolved };
}
