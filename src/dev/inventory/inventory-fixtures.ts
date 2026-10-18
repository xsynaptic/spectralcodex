import type { OpenGraphMetadataItem } from '@spectralcodex/scripts/og-image';
import type { Page } from 'astro';

import { probeLuminanceTop, toOpenGraphEntryItem } from '@spectralcodex/scripts/og-image';
import path from 'node:path';

import type { WebmentionReply } from '#components/webmentions/webmentions-data.ts';
import type { CatalogItem, ImageFeaturedWithCaption } from '#lib/catalog/catalog-types.ts';
import type { ChronologyDailyCounts } from '#lib/collections/chronology/chronology-types.ts';
import type { ComputedEntry } from '#lib/collections/collections-types.ts';
import type { Citation } from '#lib/collections/resources/resources-citation.ts';
import type { ResourceLink, ResourceSource } from '#lib/collections/resources/resources-data.ts';
import type { MultilingualContent } from '#lib/i18n/i18n-types.ts';
import type { ImageComponentProps, ImagePlaceholderProps } from '#lib/image/image-types.ts';
import type { DateRecordedEntry } from '#lib/utils/date.ts';

import { getImagesCollection } from '#lib/collections/images/images-data.ts';
import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { getLocationsNearbyList } from '#lib/collections/locations/locations-queries.ts';
import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { getRegionsCollection } from '#lib/collections/regions/regions-data.ts';
import { getResourcesCollection } from '#lib/collections/resources/resources-data.ts';
import { getThemesCollection } from '#lib/collections/themes/themes-data.ts';
import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';
import { getImageBreakpoints, getImageLayoutSizesProp } from '#lib/image/image-layout.ts';
import { ImageLayoutEnum, ImageSizeEnum } from '#lib/image/image-types.ts';
import { createMapDataFunction } from '#lib/map/map-data.ts';
import { getLocationsMapRule } from '#lib/map/map-locations.ts';
import { getDayKey } from '#lib/utils/date.ts';
import { sanitizeImageAltAttribute } from '#lib/utils/text.ts';

export const sampleUrl = '/inventory/';

export async function getSampleDivisionRegion() {
	const { entries } = await getRegionsCollection();

	return entries.find((entry) => entry.data.divisionId);
}

export async function getSampleImages() {
	const { entries } = await getImagesCollection();

	const entryById = new Map(entries.map((entry) => [entry.id, entry]));

	const featuredIds = await getSampleFeaturedImageIds();

	const featured = featuredIds.map((id) => entryById.get(id)).filter((entry) => !!entry);

	const chosen =
		featured.length >= 6
			? featured
			: [...entries].toSorted((entryA, entryB) => entryA.id.localeCompare(entryB.id));

	return {
		landscape: chosen.filter((entry) => entry.data.width >= entry.data.height).slice(0, 6),
		portrait: chosen.find((entry) => entry.data.height > entry.data.width),
	};
}

export async function getSampleLocations() {
	const { entries } = await getLocationsCollection();

	return entries.filter((entry) => entry.data.regions.length > 0).slice(0, 5);
}

export async function getSampleNearbyLocations() {
	const { entries } = await getLocationsCollection();

	const entry = entries.find((entry) => entry.data._nearby.length > 1);

	if (!entry) return [];

	const locations = await getLocationsNearbyList(entry, 5);

	return locations.map((location) => ({ ...location, url: getSampleUrl('locations-nearby-list') }));
}

export async function getSampleRegions() {
	const { entries } = await getRegionsCollection();

	const nested = entries.filter((entry) => entry.data._ancestors.length > 0);

	const deepest = [...nested].toSorted(
		(regionA, regionB) => regionB.data._ancestors.length - regionA.data._ancestors.length,
	)[0];

	return { deepest, nested: nested.slice(0, 3) };
}

export async function getSampleRelatedRegion() {
	const { entries } = await getRegionsCollection();

	return entries.find(
		(entry) => entry.data._children.length > 0 && entry.data._siblings.length > 0,
	);
}

async function getSampleFeaturedImageIds() {
	const [themes, regions] = await Promise.all([getThemesCollection(), getRegionsCollection()]);

	return [...themes.entries, ...regions.entries]
		.map((entry) => ({
			entryQuality: entry.data.entryQuality,
			ids: Array.isArray(entry.data.imageFeatured)
				? entry.data.imageFeatured.map((item) => (typeof item === 'string' ? item : item.id))
				: [],
		}))
		.toSorted(
			(candidateA, candidateB) =>
				candidateB.ids.length - candidateA.ids.length ||
				candidateB.entryQuality - candidateA.entryQuality,
		)
		.flatMap((candidate) => candidate.ids);
}

function getSampleUrl(fragment: string) {
	return `${sampleUrl}#${fragment}`;
}

export function createSampleImageProps(entry: ComputedEntry<'images'>) {
	const aspectRatio = entry.data.width / entry.data.height;

	return {
		imageProps: {
			alt: sanitizeImageAltAttribute(entry.data.title),
			breakpoints: getImageBreakpoints({ maxWidth: entry.data.width }),
			height: Math.round(ImageSizeEnum.Medium / aspectRatio),
			sizes: getImageLayoutSizesProp(ImageLayoutEnum.Default),
			src: entry.id,
			unstyled: true,
			width: ImageSizeEnum.Medium,
		} satisfies ImageComponentProps,
		placeholderProps: { aspectRatio, imageId: entry.id } satisfies ImagePlaceholderProps,
	};
}

export async function createSampleMapData() {
	const { entries } = await getLocationsCollection();
	const getMapData = await createMapDataFunction();

	return getMapData({ rule: getLocationsMapRule(entries.slice(0, 40)) });
}

export async function getSampleResources() {
	const { entries } = await getResourcesCollection();

	const linked = entries.filter((entry) => !!entry.data.url && entry.data.showPage).slice(0, 2);
	const cited = entries.filter((entry) => !!entry.data.authors?.length).slice(0, 2);

	return {
		links: linked.map((entry) => ({ id: entry.id, ...entry.data, url: entry.data.url ?? '' })),
		sources: cited.map((entry) => ({ id: entry.id, ...entry.data })),
	};
}

export async function getSampleThemes() {
	const { entries } = await getThemesCollection();

	return entries.slice(0, 4);
}

export const samplePlaces = ['Chiayi', 'Xinying', 'Huwei', 'Beigang'];

const sampleCaptions = [
	'Former Taisugar narrow-gauge shed, Chiayi',
	'Cane loading siding, Xinying',
	'Locomotive works, Huwei',
	'Terminus platform, Beigang',
];

export function createSampleImageFeaturedGroup(entries: Array<ComputedEntry<'images'>>) {
	return entries.map((entry, index) => ({
		caption: {
			title: sampleCaptions[index] ?? entry.data.title,
			titleMultilingual: index === 0 ? sampleTitleChinese : undefined,
			url: getSampleUrl('image-hero'),
		},
		hero: true,
		id: entry.id,
	})) satisfies Array<ImageFeaturedWithCaption>;
}

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
	currentPage,
	items,
	lastPage,
}: {
	currentPage: number;
	items: Array<CatalogItem>;
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
		url: {
			current: getSampleUrl('pagination'),
			first: getSampleUrl('pagination'),
			last: getSampleUrl('pagination'),
			next: currentPage < lastPage ? getSampleUrl('pagination') : undefined,
			prev: currentPage > 1 ? getSampleUrl('pagination') : undefined,
		},
	};
}

function createCatalogItem(item: Partial<CatalogItem> & Pick<CatalogItem, 'id' | 'title'>) {
	return {
		backlinks: new Set<string>(),
		collection: 'posts',
		dateCreated: sampleDate,
		dateRecorded: undefined,
		dateUpdated: undefined,
		description: undefined,
		entryQuality: 3,
		hideFromLists: false,
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

export const sampleLinkInline = {
	title: 'Chiayi County cultural heritage register',
	url: 'https://example.org/chiayi-heritage',
} satisfies ResourceLink;

export const sampleSourceInline = {
	authors: [{ name: 'Huang Mei-ling' }],
	publishedDate: '2009',
	publisher: 'Taiwan Railway Press',
	resourceType: 'book',
	title: 'Narrow Gauge in the Tropics',
} satisfies ResourceSource;

export const sampleWebmentionCounts = [
	{ count: 34, label: 'Likes' },
	{ count: 7, label: 'Reposts' },
	{ count: 3, label: 'Bookmarks' },
];

export const sampleWebmentionReplies = [
	{
		authorName: 'A reader with a linked profile',
		authorUrl: sampleUrl,
		dateReceived: new Date('2026-07-14T08:12:00Z'),
		id: 1,
		sourceUrl: sampleUrl,
		text: 'A reply long enough to reach the forty-word clip: the sugar railways ran on a gauge narrow enough that the sheds still standing at Huwei read as models rather than as workshops, which is exactly what makes them worth the detour when the light is low and the doors are open to anyone who asks.',
	},
	{
		authorName: 'A reader with no profile URL',
		authorUrl: undefined,
		dateReceived: new Date('2026-06-30T19:40:00Z'),
		id: 2,
		sourceUrl: sampleUrl,
		text: undefined,
	},
] satisfies Array<WebmentionReply>;

export const sampleChronologyYears = ['2019', '2021', '2023', '2024', '2025', '2026'];

export const sampleChronologyMonths = ['02', '05', '09', '11'];

interface OpenGraphCard {
	entry: OpenGraphMetadataItem;
	imagePath: string;
}

interface SampleOpenGraphCard extends OpenGraphCard {
	key: string;
}

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

export function createSampleDailyData(values: Record<string, number>) {
	const dailyData: Record<string, ChronologyDailyCounts> = {};

	for (const [dayKey, total] of Object.entries(values)) {
		const visited = Math.floor(total / 3);
		const updated = Math.floor((total - visited) / 2);

		dailyData[dayKey] = { created: total - visited - updated, updated, visited };
	}

	return dailyData;
}

const openGraphLuminanceSampleCount = 24;

const openGraphTitleSamples = [
	{
		key: 'title-long',
		title:
			'Former Taiwan Sugar Corporation Narrow-Gauge Locomotive Workshops and Cane Loading Sidings at Huwei',
		titleZh: '臺灣糖業股份有限公司虎尾糖廠輕便鐵道機車工場與甘蔗裝載側線',
	},
	{
		key: 'title-zh',
		title: 'Taiwan Sugar Railway',
		titleZh: sampleTitleChinese.value,
	},
	{
		key: 'title-ja',
		title: 'Monopoly Bureau of the Government-General of Taiwan',
		// Shinjitai, because Zen Antique has no glyphs for the traditional forms
		titleJa: '台湾総督府専売局',
	},
	{
		key: 'title-th',
		title: 'Bangkok Railway Station',
		titleTh: sampleTitleThai.value,
	},
];

async function createSampleOpenGraphCards() {
	const [posts, locations, images, sampleImages] = await Promise.all([
		getPostsCollection(),
		getLocationsCollection(),
		getImagesCollection(),
		getSampleImages(),
	]);

	const candidates = [...posts.entries, ...locations.entries].flatMap<OpenGraphCard>((entry) => {
		const item = toOpenGraphEntryItem({ collection: entry.collection, entry });
		const image = item ? images.entriesMap.get(item.imageFeaturedId) : undefined;

		return item && image ? [{ entry: item, imagePath: path.resolve(image.data.path) }] : [];
	});

	const groundCandidates = candidates.filter(({ entry }) => !entry.isFallback && !entry.titleZh);

	const ranked = await Promise.all(
		groundCandidates.slice(0, openGraphLuminanceSampleCount).map(async (candidate) => ({
			candidate,
			luminance: await probeLuminanceTop(candidate.imagePath),
		})),
	);

	ranked.sort((first, second) => second.luminance - first.luminance);

	const titleImage = sampleImages.landscape[0];

	const titleCards = titleImage
		? openGraphTitleSamples.map(({ key, ...title }) => ({
				entry: { collection: 'inventory', id: key, isFallback: false, ...title },
				imagePath: path.resolve(titleImage.data.path),
				key,
			}))
		: [];

	return [
		...toOpenGraphCard('ground-dark', ranked.at(-1)?.candidate),
		...toOpenGraphCard('ground-bright', ranked[0]?.candidate),
		...titleCards,
		...toOpenGraphCard(
			'image-fallback',
			candidates.find(({ entry }) => entry.isFallback),
		),
	];
}

function toOpenGraphCard(key: string, card: OpenGraphCard | undefined): Array<SampleOpenGraphCard> {
	return card ? [{ key, ...card }] : [];
}

let sampleOpenGraphCards: Promise<Array<SampleOpenGraphCard>> | undefined;

export function getSampleOpenGraphCards() {
	if (!sampleOpenGraphCards) {
		sampleOpenGraphCards = createSampleOpenGraphCards();
	}

	return sampleOpenGraphCards;
}

export { locationStatusOrder as sampleStatuses } from '@spectralcodex/shared/map';
