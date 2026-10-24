import { ContentCollectionsEnum } from '@spectralcodex/shared/collections';
import { getPublicId } from '@spectralcodex/shared/entries';
import { getOpenGraphId } from '@spectralcodex/shared/open-graph';
import { stripDiacritics } from '@spectralcodex/shared/text';
import { z } from 'zod';

import type { OpenGraphEntryItem } from '#og-image/types.ts';
import type { ContentEntry } from '#shared/astro-content.ts';
import type { RegionParentMap } from '#shared/entries.ts';

import { getChronologyTitle } from '#og-image/chronology.ts';
import { getFallbackImageId } from '#og-image/fallback.ts';
import { getRegionParentsById, toReferenceIds } from '#shared/entries.ts';
import { getEntryImageIds } from '#shared/image-references.ts';

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
	const imageFeaturedId = getEntryImageIds(entry).featured[0];

	if (imageFeaturedId) return { imageFeaturedId, isFallback: false };

	if (chronologyImageIndex && collection === ContentCollectionsEnum.Chronology) {
		const derivedImageId = chronologyImageIndex.get(getOpenGraphId(getPublicId(entry)));

		if (derivedImageId) return { imageFeaturedId: derivedImageId, isFallback: false };
	}

	return {
		imageFeaturedId: getFallbackImageId({
			category: z.string().optional().parse(entry.data.category),
			collection,
			id: getPublicId(entry),
			regions: regionParentMap
				? getRegionParentsById(
						collection === ContentCollectionsEnum.Regions
							? z.string().optional().parse(entry.data.parent)
							: toReferenceIds(entry.data.regions)[0],
						regionParentMap,
					)
				: undefined,
			themes: toReferenceIds(entry.data.themes),
		}),
		isFallback: true,
	};
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
	const title = resolveEntryTitle({ collection, data: entry.data, id });

	if (title === undefined) return undefined;

	return {
		collection,
		id,
		title: stripDiacritics(title),
		...getMultilingualTitles(entry.data),
		...getImageFeaturedData({ chronologyImageIndex, collection, entry, regionParentMap }),
	};
}

function getMultilingualTitles(data: Record<string, unknown>) {
	return {
		titleJa: parseOptionalString(data.title_ja),
		titleTh: parseOptionalString(data.title_th),
		titleZh: parseOptionalString(data.title_zh),
	};
}

function parseOptionalString(value: unknown) {
	return z.string().optional().parse(value);
}

// `undefined` marks an entry that gets no OG image at all
function resolveEntryTitle({
	collection,
	data,
	id,
}: {
	collection: string;
	data: Record<string, unknown>;
	id: string;
}): string | undefined {
	if (collection === ContentCollectionsEnum.Chronology) return getChronologyTitle(id);

	const title = z.string().optional().parse(data.title);

	if (!title) return undefined;

	// A resource without `showPage` has no page, so no OG image
	if (collection === ContentCollectionsEnum.Resources && !data.showPage) return undefined;

	return title;
}
