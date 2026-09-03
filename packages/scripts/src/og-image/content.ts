import { ContentCollectionsEnum } from '@spectralcodex/shared/collections';
import { stripDiacritics } from '@spectralcodex/shared/text';
import { z } from 'zod';

import type { ContentEntry } from '../shared/astro-content.js';
import type { RegionParentMap } from '../shared/entries.js';
import type { OpenGraphContentEntry, OpenGraphEntryItem } from './types.js';

import { getRegionParentsById, getPublicId, toReferenceIds } from '../shared/entries.js';
import { extractImageFeaturedIds } from '../shared/images.js';
import { getChronologyTitle } from './chronology.js';
import { getFallbackImageId } from './fallback.js';

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
	entry: Pick<ContentEntry, 'data' | 'id'>;
	collection: string;
	regionParentMap?: RegionParentMap | undefined;
	chronologyImageIndex?: Map<string, string> | undefined;
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
				? getRegionParentsById(
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

// The one place an entry becomes a card, shared with the dev-only Inventory route
export function toOpenGraphEntryItem({
	entry,
	collection,
	regionParentMap,
	chronologyImageIndex,
}: {
	entry: Pick<ContentEntry, 'data' | 'id'>;
	collection: string;
	regionParentMap?: RegionParentMap | undefined;
	chronologyImageIndex?: Map<string, string> | undefined;
}): OpenGraphEntryItem | undefined {
	const id = getPublicId(entry).replace('/', '-');
	const override = parseTitleOverride(collection, entry.data);
	const title = resolveEntryTitle({ collection, id, data: entry.data, override });

	if (title === undefined) return undefined;

	return {
		collection,
		id,
		title: stripDiacritics(title),
		...getMultilingualTitles(entry.data, override),
		...getImageFeaturedData({ entry, collection, regionParentMap, chronologyImageIndex }),
	};
}

// Resolution order: content entries, then static index entries, then synthesized chronology ids
export function resolveEntry({
	filename,
	contentEntries,
	indexEntries,
	chronologyImageIndex,
}: {
	filename: string;
	contentEntries: Map<string, OpenGraphContentEntry>;
	indexEntries: Map<string, OpenGraphContentEntry>;
	chronologyImageIndex: Map<string, string>;
}): OpenGraphContentEntry | undefined {
	const fromContent = contentEntries.get(filename);

	if (fromContent) return fromContent;

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
