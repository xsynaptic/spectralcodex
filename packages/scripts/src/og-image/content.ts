import { ContentCollectionsEnum } from '@spectralcodex/shared/collections';
import { getPublicId } from '@spectralcodex/shared/entries';
import { getOpenGraphId } from '@spectralcodex/shared/open-graph';
import { stripDiacritics } from '@spectralcodex/shared/text';
import { z } from 'zod';

import type { OpenGraphContentEntry, OpenGraphEntryItem } from '#og-image/types.ts';
import type { ContentEntry } from '#shared/astro-content.ts';
import type { RegionParentMap } from '#shared/entries.ts';

import { getChronologyTitle } from '#og-image/chronology.ts';
import { getFallbackImageId } from '#og-image/fallback.ts';
import { getRegionParentsById, toReferenceIds } from '#shared/entries.ts';
import { extractImageFeaturedIds } from '#shared/images.ts';

// Sensitive locations present override regions; fallback imagery must not leak the true region
export function resolveOgRegions(data: Record<string, unknown>): Array<string> {
	const override = z.object({ regions: z.unknown() }).safeParse(data.override);
	const overrideRegions = toReferenceIds(override.data?.regions);

	return overrideRegions.length > 0 ? overrideRegions : toReferenceIds(data.regions);
}

function getImageFeaturedData({
	chronologyImageIndex,
	collection,
	entry,
	regionParentMap,
}: {
	chronologyImageIndex?: Map<string, string> | undefined;
	collection: string;
	entry: Pick<ContentEntry, 'data' | 'id'>;
	regionParentMap?: RegionParentMap | undefined;
}): { imageFeaturedId: string; isFallback: boolean } {
	const imageFeaturedId = extractImageFeaturedIds(entry.data)[0];

	if (imageFeaturedId) return { imageFeaturedId, isFallback: false };

	if (chronologyImageIndex && collection === ContentCollectionsEnum.Chronology) {
		const derivedImageId = chronologyImageIndex.get(getOpenGraphId(getPublicId(entry)));

		if (derivedImageId) return { imageFeaturedId: derivedImageId, isFallback: false };
	}

	return {
		imageFeaturedId: getFallbackImageId({
			category: z.string().optional().parse(entry.data.category),
			collection,
			id: entry.id,
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
		title_ja: z.string().optional(),
		title_th: z.string().optional(),
		title_zh: z.string().optional(),
	})
	.optional();

type TitleOverride = z.infer<typeof TitleOverrideSchema>;

// Resolution order: content entries, then static index entries, then synthesized chronology ids
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

// The one place an entry becomes a card, shared with the dev-only Inventory route
export function toOpenGraphEntryItem({
	chronologyImageIndex,
	collection,
	entry,
	regionParentMap,
}: {
	chronologyImageIndex?: Map<string, string> | undefined;
	collection: string;
	entry: Pick<ContentEntry, 'data' | 'id'>;
	regionParentMap?: RegionParentMap | undefined;
}): OpenGraphEntryItem | undefined {
	const id = getOpenGraphId(getPublicId(entry));
	const override = parseTitleOverride(collection, entry.data);
	const title = resolveEntryTitle({ collection, data: entry.data, id, override });

	if (title === undefined) return undefined;

	return {
		collection,
		id,
		title: stripDiacritics(title),
		...getMultilingualTitles(entry.data, override),
		...getImageFeaturedData({ chronologyImageIndex, collection, entry, regionParentMap }),
	};
}

function getMultilingualTitles(data: Record<string, unknown>, override: TitleOverride) {
	return {
		titleJa: parseOptionalString(override?.title_ja ?? data.title_ja),
		titleTh: parseOptionalString(override?.title_th ?? data.title_th),
		titleZh: parseOptionalString(override?.title_zh ?? data.title_zh),
	};
}

function parseOptionalString(value: unknown) {
	return z.string().optional().parse(value);
}

function parseTitleOverride(collection: string, data: Record<string, unknown>): TitleOverride {
	if (collection !== ContentCollectionsEnum.Locations) return undefined;

	return TitleOverrideSchema.parse(data.override);
}

// `undefined` marks an entry that gets no OG image at all
function resolveEntryTitle({
	collection,
	data,
	id,
	override,
}: {
	collection: string;
	data: Record<string, unknown>;
	id: string;
	override: TitleOverride;
}): string | undefined {
	if (collection === ContentCollectionsEnum.Chronology) return getChronologyTitle(id);

	const title = override?.title ?? z.string().optional().parse(data.title);

	if (!title) return undefined;

	// A resource without `showPage` has no page, so no OG image
	if (collection === ContentCollectionsEnum.Resources && !data.showPage) return undefined;

	return title;
}
