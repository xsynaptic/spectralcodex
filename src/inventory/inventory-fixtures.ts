import type { Page } from 'astro';
import type { CollectionEntry } from 'astro:content';

import type { WebmentionReply } from '#components/sections/section-webmentions.ts';
import type { CatalogItem, ImageFeaturedWithCaption } from '#lib/catalog/catalog-types.ts';
import type { Citation } from '#lib/collections/resources/resources-citation.ts';
import type { ResourceLink, ResourceSource } from '#lib/collections/resources/resources-utils.ts';
import type { MultilingualContent } from '#lib/i18n/i18n-types.ts';
import type { ImageComponentProps, ImagePlaceholderProps } from '#lib/image/image-types.ts';
import type { DateRecordedEntry } from '#lib/utils/date.ts';

import { getImagesCollection } from '#lib/collections/images/images-data.ts';
import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { getRegionsCollection } from '#lib/collections/regions/regions-data.ts';
import { getResourcesCollection } from '#lib/collections/resources/resources-data.ts';
import { getThemesCollection } from '#lib/collections/themes/themes-data.ts';
import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';
import { getImageBreakpoints, getImageLayoutSizesProp } from '#lib/image/image-layout.ts';
import { ImageLayoutEnum, ImageSizeEnum } from '#lib/image/image-types.ts';
import { getMapData } from '#lib/map/map-data.ts';
import { getLocationsFeatureCollection } from '#lib/map/map-locations.ts';
import { getDayKey } from '#lib/utils/date.ts';
import { sanitizeImageAltAttribute } from '#lib/utils/text.ts';

// Every URL on this page points back at the page itself; nothing here should navigate away
export const sampleUrl = '/inventory/';

function getSampleUrl(fragment: string) {
	return `${sampleUrl}#${fragment}`;
}

// Themes and Regions promote all their Featured Images to Heroes, so they carry the longest groups
async function getSampleFeaturedImageIds() {
	const [themes, regions] = await Promise.all([getThemesCollection(), getRegionsCollection()]);

	return [...themes.entries, ...regions.entries]
		.map((entry) => {
			const { imageFeatured } = entry.data;

			return {
				ids: Array.isArray(imageFeatured)
					? imageFeatured.map((item) => (typeof item === 'string' ? item : item.id))
					: [],
				entryQuality: entry.data.entryQuality,
			};
		})
		.sort(
			(candidateA, candidateB) =>
				candidateB.ids.length - candidateA.ids.length ||
				candidateB.entryQuality - candidateA.entryQuality,
		)
		.flatMap((candidate) => candidate.ids);
}

// Images resolve their id against the Images collection, so a fixture cannot invent one
// Falls back to the id order for a media library whose Entries feature nothing
export async function getSampleImages() {
	const { entries } = await getImagesCollection();

	const entryById = new Map(entries.map((entry) => [entry.id, entry]));

	const featuredIds = await getSampleFeaturedImageIds();

	const featured = featuredIds.map((id) => entryById.get(id)).filter((entry) => !!entry);

	const chosen =
		featured.length >= 6
			? featured
			: [...entries].sort((entryA, entryB) => entryA.id.localeCompare(entryB.id));

	return {
		landscape: chosen.filter((entry) => entry.data.width >= entry.data.height).slice(0, 6),
		portrait: chosen.find((entry) => entry.data.height > entry.data.width),
	};
}

// A preview subtitle walks a Region's ancestors and throws on an id the collection does not hold
export async function getSampleRegionId() {
	const { entries } = await getRegionsCollection();

	const byDepth = entries
		.map((entry) => ({ depth: entry.data._ancestors?.length ?? 0, id: entry.id }))
		.sort((regionA, regionB) => regionB.depth - regionA.depth);

	return byDepth[0]?.id;
}

export async function getSampleRegionIds() {
	const { entries } = await getRegionsCollection();

	return entries
		.filter((entry) => (entry.data._ancestors?.length ?? 0) > 0)
		.slice(0, 3)
		.map((entry) => entry.id);
}

export async function getSampleThemeIds() {
	const { entries } = await getThemesCollection();

	return entries.slice(0, 4).map((entry) => entry.id);
}

// Built from real entries so the flattened shape cannot drift from the Resource schema
export async function getSampleResources() {
	const { entries } = await getResourcesCollection();

	// `showPage` adds the italic link to the Resource's own page beside the outbound one
	const linked = entries.filter((entry) => !!entry.data.url && entry.data.showPage).slice(0, 2);
	const cited = entries.filter((entry) => !!entry.data.authors?.length).slice(0, 2);

	return {
		links: linked.map((entry) => ({ id: entry.id, ...entry.data, url: entry.data.url ?? '' })),
		sources: cited.map((entry) => ({ id: entry.id, ...entry.data })),
	};
}

// Omitting `mapId` takes the MDX inline branch: the map draws without a chunk endpoint existing
export async function createSampleMapData() {
	const { entries } = await getLocationsCollection();

	return getMapData({
		featureCollection: getLocationsFeatureCollection(entries.slice(0, 40)),
		version: undefined,
	});
}

export function createSampleImageProps(entry: CollectionEntry<'images'>) {
	const aspectRatio = entry.data.width / entry.data.height;

	return {
		imageProps: {
			src: entry.id,
			breakpoints: getImageBreakpoints({ maxWidth: entry.data.width }),
			sizes: getImageLayoutSizesProp(ImageLayoutEnum.Default),
			width: ImageSizeEnum.Medium,
			height: Math.round(ImageSizeEnum.Medium / aspectRatio),
			alt: sanitizeImageAltAttribute(entry.data.title),
			unstyled: true,
		} satisfies ImageComponentProps,
		placeholderProps: { aspectRatio, imageId: entry.id } satisfies ImagePlaceholderProps,
	};
}

export const samplePlaces = ['Chiayi', 'Xinying', 'Huwei', 'Beigang'];

const sampleCaptions = [
	'Former Taisugar narrow-gauge shed, Chiayi',
	'Cane loading siding, Xinying',
	'Locomotive works, Huwei',
	'Terminus platform, Beigang',
];

export function createSampleImageFeaturedGroup(entries: Array<CollectionEntry<'images'>>) {
	return entries.map((entry, index) => ({
		hero: true,
		id: entry.id,
		caption: {
			title: sampleCaptions[index % sampleCaptions.length] ?? entry.data.title,
			titleMultilingual: index === 0 ? sampleTitleChinese : undefined,
			url: getSampleUrl('image-hero'),
		},
	})) satisfies Array<ImageFeaturedWithCaption>;
}

// Dates carry a time so the long preset has something to show; the medium preset drops it
export const sampleDate = new Date('2026-03-14T09:20:00Z');
export const sampleDateUpdated = new Date('2026-07-02T16:45:00Z');
export const sampleDateEnd = new Date('2026-03-17T11:05:00Z');

export const sampleDatesRecorded = [
	{ date: new Date('2019-05-13T00:00:00Z'), hasTime: false },
	[
		{ date: new Date('2021-11-02T08:30:00Z'), hasTime: true },
		{ date: new Date('2021-11-04T17:15:00Z'), hasTime: true },
	],
	{ date: new Date('2024-02-28T14:00:00Z'), hasTime: true },
] satisfies Array<DateRecordedEntry>;

export const sampleTitleChinese = {
	lang: LanguageCodeEnum.ChineseTraditional,
	value: '臺灣糖業鐵路',
} satisfies MultilingualContent;

export const sampleTitleChineseSimplified = {
	lang: LanguageCodeEnum.ChineseSimplified,
	value: '台湾糖业铁路',
} satisfies MultilingualContent;

export const sampleTitleJapanese = {
	lang: LanguageCodeEnum.Japanese,
	value: '臺灣總督府專賣局',
} satisfies MultilingualContent;

export const sampleTitleKorean = {
	lang: LanguageCodeEnum.Korean,
	value: '군산 근대건축관',
} satisfies MultilingualContent;

export const sampleTitleThai = {
	lang: LanguageCodeEnum.Thai,
	value: 'สถานีรถไฟกรุงเทพ',
} satisfies MultilingualContent;

export const sampleTitleVietnamese = {
	lang: LanguageCodeEnum.Vietnamese,
	value: 'Nhà thờ Đức Bà Sài Gòn',
} satisfies MultilingualContent;

export const sampleCitation = {
	authors: 'Chen Wei-ting & Lin Shu-fen',
	delimiter: ', ',
	published: 'Academia Historica, 2014',
	title: 'Sugar Railways of the Chianan Plain',
} satisfies Citation;

export const sampleCitationMultilingual = {
	authors: '陳威廷，林淑芬',
	delimiter: '，',
	published: '國史館，2014',
	title: '《嘉南平原糖業鐵道》',
} satisfies Citation;

function createCatalogItem(item: Partial<CatalogItem> & Pick<CatalogItem, 'id' | 'title'>) {
	return {
		backlinks: new Set<string>(),
		collection: 'posts',
		dateCreated: sampleDate,
		dateRecorded: undefined,
		dateUpdated: undefined,
		description: undefined,
		entryQuality: 3,
		imageHeroId: undefined,
		imageId: undefined,
		linksExternalCount: 0,
		locationCount: undefined,
		postCount: undefined,
		regionPrimaryId: undefined,
		titleMultilingual: undefined,
		url: getSampleUrl(item.id),
		wordCount: 820,
		...item,
	} satisfies CatalogItem;
}

interface SampleCatalogOptions {
	imageIds: Array<string>;
	regionId: string | undefined;
}

export function createSampleCatalogItems({ imageIds, regionId }: SampleCatalogOptions) {
	return [
		createCatalogItem({
			collection: 'locations',
			description: 'A *rendered* description, clipped from the opening of the body.',
			id: 'inv-sample-location',
			imageId: imageIds[0],
			locationCount: 14,
			regionPrimaryId: regionId,
			title: 'Taiwan Sugar Railway workshops',
			titleMultilingual: sampleTitleChinese,
		}),
		createCatalogItem({
			dateCreated: new Date('2025-11-24T10:00:00Z'),
			dateUpdated: sampleDateUpdated,
			id: 'inv-sample-post',
			imageId: imageIds[1],
			regionPrimaryId: regionId,
			title: 'A Post title long enough to wrap across two lines in a card',
			wordCount: 4210,
		}),
		createCatalogItem({
			collection: 'themes',
			dateCreated: new Date('2025-08-09T18:30:00Z'),
			id: 'inv-sample-theme',
			imageId: imageIds[2],
			locationCount: 1183,
			postCount: 42,
			title: 'Movie theaters of Taiwan',
			titleMultilingual: sampleTitleJapanese,
		}),
		createCatalogItem({
			collection: 'regions',
			dateCreated: new Date('2025-04-02T07:15:00Z'),
			id: 'inv-sample-region',
			title: 'A card with no Featured Image, falling back to the seigaiha pattern',
		}),
	];
}

export function createSamplePage({
	items,
	currentPage,
	lastPage,
}: {
	items: Array<CatalogItem>;
	currentPage: number;
	lastPage: number;
}): Page<CatalogItem> {
	return {
		currentPage,
		data: items,
		end: items.length - 1,
		lastPage,
		size: items.length,
		start: 0,
		total: items.length * lastPage,
		// Fragments, not paths: the select navigates on change and those pages do not exist
		url: {
			current: getSampleUrl('pagination'),
			first: getSampleUrl('pagination'),
			last: getSampleUrl('pagination'),
			next: currentPage < lastPage ? getSampleUrl('pagination') : undefined,
			prev: currentPage > 1 ? getSampleUrl('pagination') : undefined,
		},
	};
}

// The other half of each union: a Link and a Source written inline in frontmatter, with no Resource
export const sampleLinkInline = {
	title: 'Chiayi County cultural heritage register',
	url: 'https://example.org/chiayi-heritage',
} satisfies ResourceLink;

export const sampleSourceInline = {
	title: 'Narrow Gauge in the Tropics',
	resourceType: 'book',
	authors: [{ name: 'Huang Mei-ling' }],
	publisher: 'Taiwan Railway Press',
	publishedDate: '2009',
} satisfies ResourceSource;

export const sampleWebmentionCounts = [
	{ label: 'Likes', count: 34 },
	{ label: 'Reposts', count: 7 },
	{ label: 'Bookmarks', count: 3 },
];

export const sampleWebmentionReplies = [
	{
		id: 1,
		authorName: 'A reader with a linked profile',
		authorUrl: sampleUrl,
		sourceUrl: sampleUrl,
		dateReceived: new Date('2026-07-14T08:12:00Z'),
		text: 'A reply long enough to reach the forty-word clip: the sugar railways ran on a gauge narrow enough that the sheds still standing at Huwei read as models rather than as workshops, which is exactly what makes them worth the detour when the light is low and the doors are open to anyone who asks.',
	},
	{
		id: 2,
		authorName: 'A reader with no profile URL',
		authorUrl: undefined,
		sourceUrl: sampleUrl,
		dateReceived: new Date('2026-06-30T19:40:00Z'),
		text: undefined,
	},
] satisfies Array<WebmentionReply>;

// Heavy-tailed counts spread over all four intensity bins; a flat ramp renders as a single shade
export function createSampleActivityValues(year: string) {
	const values: Record<string, number> = {};
	const yearNumber = Number(year);

	for (let dayIndex = 0; dayIndex < 366; dayIndex++) {
		const date = new Date(Date.UTC(yearNumber, 0, 1 + dayIndex));

		if (date.getUTCFullYear() !== yearNumber) break;

		const seed = (dayIndex * 2_654_435_761) % 97;

		if (seed < 52) continue;

		values[getDayKey(date)] = seed === 96 ? 61 : 1 + (seed % 11);
	}

	return values;
}
