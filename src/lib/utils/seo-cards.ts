import type { PageOpenGraphCard } from '@spectralcodex/shared/open-graph';
import type { ImageFeatured } from '@spectralcodex/shared/schemas';

import { getPublicId } from '@spectralcodex/shared/entries';
import {
	getFallbackImageId,
	resolveFallbackImageId,
} from '@spectralcodex/shared/open-graph-fallback';
import { stripDiacritics } from '@spectralcodex/shared/text';

import type { MultilingualContent } from '#lib/i18n/i18n-types.ts';
import type { DescriptionEntry } from '#lib/utils/description.ts';

import { getRegionsCollection } from '#lib/collections/regions/regions-data.ts';
import { formatTitleMultilingual } from '#lib/i18n/i18n-utils.ts';
import { getImageFeaturedId } from '#lib/image/image-featured.ts';
import { getDescriptionRenderedText } from '#lib/utils/description-data.ts';
import { getSeoImageProps } from '#lib/utils/seo.ts';

interface CardEntry {
	collection: string;
	data: {
		category?: string;
		imageFeatured?: ImageFeatured | undefined;
		regions?: Array<{ id: string }> | undefined;
		themes?: Array<{ id: string }> | undefined;
		title: string;
		title_ja?: string | undefined;
		title_th?: string | undefined;
		title_zh?: string | undefined;
	};
	id: string;
}

const indexCardBlur = {
	atlas: false,
	chronology: true,
	homepage: false,
	locations: true,
	'not-found': true,
	posts: true,
	regions: false,
	resources: true,
	series: true,
	themes: true,
} as const;

type IndexCardKey = keyof typeof indexCardBlur;

export async function createEntryCardFunction() {
	const { entriesMap: regionsMap } = await getRegionsCollection();

	function getRootFirstAncestors(regionId: string) {
		return regionsMap.get(regionId)?.data._ancestors.toReversed() ?? [];
	}

	function getRegionChain(entry: CardEntry) {
		if (entry.collection === 'regions') return getRootFirstAncestors(entry.id);

		const regionId = entry.data.regions?.[0]?.id;

		if (!regionId) return [];

		return [...getRootFirstAncestors(regionId), regionId];
	}

	return function getEntryCard(entry: CardEntry): PageOpenGraphCard {
		const id = getPublicId(entry);
		const imageFeaturedId = getImageFeaturedId({ imageFeatured: entry.data.imageFeatured });
		const titles = {
			title: stripDiacritics(entry.data.title),
			titleJa: entry.data.title_ja,
			titleTh: entry.data.title_th,
			titleZh: entry.data.title_zh,
		};

		if (imageFeaturedId) return { id, image: { id: imageFeaturedId, isBlurred: false }, titles };

		const fallbackImageId = getFallbackImageId({
			category: entry.data.category,
			collection: entry.collection,
			id,
			regions: getRegionChain(entry),
			themes: entry.data.themes?.map((theme) => theme.id),
		});

		return { id, image: { id: fallbackImageId, isBlurred: true }, titles };
	};
}

export async function createEntryMetaFunction() {
	const getEntryCard = await createEntryCardFunction();

	return function getEntryMeta(
		entry: CardEntry & DescriptionEntry,
		titleMultilingual: MultilingualContent | undefined,
	) {
		return {
			description: getDescriptionRenderedText(entry),
			image: getSeoImageProps({ alt: entry.data.title, card: getEntryCard(entry) }),
			title: formatTitleMultilingual(entry.data.title, titleMultilingual),
		};
	};
}

export function getChronologyCard({
	id,
	imageId,
	title,
}: {
	id: string;
	imageId: string | undefined;
	title: string;
}): PageOpenGraphCard {
	if (imageId) return { id, image: { id: imageId, isBlurred: false }, titles: { title } };

	const fallbackImageId = getFallbackImageId({ collection: 'chronology', id });

	return { id, image: { id: fallbackImageId, isBlurred: true }, titles: { title } };
}

export function getIndexCard({
	key,
	title,
	titleZh,
}: {
	key: IndexCardKey;
	title: string;
	titleZh?: string;
}): PageOpenGraphCard {
	const id = `index-${key}`;
	const titles = titleZh === undefined ? { title } : { title, titleZh };

	return {
		id,
		image: { id: resolveFallbackImageId(key, id), isBlurred: indexCardBlur[key] },
		titles,
	};
}
