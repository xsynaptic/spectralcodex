import type { CollectionEntry } from 'astro:content';

import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { getAbsoluteUrl, getContentPath, getSitePath } from '#lib/utils/routing.ts';

const SchemaTypeEnum = {
	Article: 'Article',
	BreadcrumbList: 'BreadcrumbList',
	GeoCoordinates: 'GeoCoordinates',
	ListItem: 'ListItem',
	Person: 'Person',
	Place: 'Place',
	WebSite: 'WebSite',
} as const;

export type Thing = Article | BreadcrumbList | Person | Place | WebSite;

interface Article extends IdReference {
	'@type': (typeof SchemaTypeEnum)['Article'];
	author: IdReference;
	dateModified?: string;
	datePublished: string;
	description?: string;
	headline: string;
	image?: string;
}

interface BreadcrumbList extends IdReference {
	'@type': (typeof SchemaTypeEnum)['BreadcrumbList'];
	itemListElement: Array<{
		'@type': 'ListItem';
		item?: string;
		name: string;
		position: number;
	}>;
}

interface Graph {
	'@context': 'https://schema.org';
	'@graph': ReadonlyArray<Thing>;
}

// Schema.org entity types adapted from schema-dts, pared down to what this project emits
interface IdReference {
	'@id': string;
}

interface Person extends IdReference {
	'@type': (typeof SchemaTypeEnum)['Person'];
	name: string;
	sameAs?: ReadonlyArray<string>;
	url: string;
}

interface Place extends IdReference {
	'@type': (typeof SchemaTypeEnum)['Place'];
	description?: string;
	geo?: {
		'@type': (typeof SchemaTypeEnum)['GeoCoordinates'];
		latitude: number;
		longitude: number;
	};
	name: string;
	url: string;
}

interface WebSite extends IdReference {
	'@type': (typeof SchemaTypeEnum)['WebSite'];
	description: string;
	name: string;
	publisher: IdReference;
	url: string;
}

// Built per call; hoisting these to module scope makes the import itself fail wherever SITE is unset
const getSiteUrl = () => getAbsoluteUrl(getSitePath());
const getAboutUrl = () => getAbsoluteUrl(getSitePath('/about'));

// @id scheme: long form for singletons, short fragment for per-page entities
const ids = {
	article: (pageUrl: string) => `${getAbsoluteUrl(pageUrl)}#article`,
	breadcrumb: (pageUrl: string) => `${getAbsoluteUrl(pageUrl)}#breadcrumb`,
	person: () => `${getAboutUrl()}#/schema.org/${SchemaTypeEnum.Person}`,
	place: (pageUrl: string) => `${getAbsoluteUrl(pageUrl)}#place`,
	website: () => `${getSiteUrl()}#/schema.org/${SchemaTypeEnum.WebSite}`,
};

export function buildArticleSchema(props: {
	dateCreated: Date;
	dateUpdated: Date | undefined;
	description: string | undefined;
	imageUrl: string | undefined;
	title: string;
	url: string;
}): Article {
	return {
		'@id': ids.article(props.url),
		'@type': SchemaTypeEnum.Article,
		headline: props.title,
		...(props.description ? { description: props.description } : {}),
		...(props.imageUrl ? { image: props.imageUrl } : {}),
		datePublished: props.dateCreated.toISOString(),
		...(props.dateUpdated ? { dateModified: props.dateUpdated.toISOString() } : {}),
		author: { '@id': ids.person() },
	};
}

export function buildAuthorSchema(options?: { sameAs?: ReadonlyArray<string> }): Person {
	const t = getTranslations();

	return {
		'@id': ids.person(),
		'@type': SchemaTypeEnum.Person,
		name: t('author.name'),
		url: getAboutUrl(),
		...(options?.sameAs && options.sameAs.length > 0 ? { sameAs: options.sameAs } : {}),
	};
}

// `regions` must be ordered root first; breadcrumb positions follow array order
export function buildEntryBreadcrumbSchema(props: {
	collection: 'locations' | 'regions' | 'resources' | 'series' | 'themes';
	regions?: ReadonlyArray<CollectionEntry<'regions'>> | undefined;
	title: string;
	url: string;
}): BreadcrumbList {
	const t = getTranslations();

	return buildBreadcrumbSchema(
		[
			{ name: t('site.title'), url: getSitePath() },
			{ name: t(`collection.${props.collection}.labelPlural`), url: getSitePath(props.collection) },
			...(props.regions ?? []).map((region) => ({
				name: region.data.title,
				url: getContentPath('regions', region.id),
			})),
			{ name: props.title },
		],
		props.url,
	);
}

export function buildPlaceSchema(props: {
	coordinates: [number, number] | undefined;
	description: string | undefined;
	title: string;
	url: string;
}): Place {
	return {
		'@id': ids.place(props.url),
		'@type': SchemaTypeEnum.Place,
		name: props.title,
		...(props.description ? { description: props.description } : {}),
		url: getAbsoluteUrl(props.url),
		...(props.coordinates
			? {
					geo: {
						'@type': SchemaTypeEnum.GeoCoordinates,
						latitude: props.coordinates[1],
						longitude: props.coordinates[0],
					},
				}
			: {}),
	};
}

export function buildWebSiteSchema(): WebSite {
	const t = getTranslations();

	return {
		'@id': ids.website(),
		'@type': SchemaTypeEnum.WebSite,
		description: t('site.description'),
		name: t('site.title'),
		publisher: { '@id': ids.person() },
		url: getSiteUrl(),
	};
}

/**
 * Serialize a page's graph entities for injection via <script type="application/ld+json">
 * Escapes `<`, `>`, `&` to prevent breaking out of the script tag
 */
export function serializeGraph(entities: ReadonlyArray<Thing>): string {
	const graph: Graph = {
		'@context': 'https://schema.org',
		'@graph': entities,
	};

	return JSON.stringify(graph)
		.replaceAll('<', String.raw`\u003c`)
		.replaceAll('>', String.raw`\u003e`)
		.replaceAll('&', String.raw`\u0026`);
}

function buildBreadcrumbSchema(
	items: ReadonlyArray<{ name: string; url?: string }>,
	pageUrl: string,
): BreadcrumbList {
	return {
		'@id': ids.breadcrumb(pageUrl),
		'@type': SchemaTypeEnum.BreadcrumbList,
		itemListElement: items.map((item, index) => ({
			'@type': SchemaTypeEnum.ListItem,
			name: item.name,
			position: index + 1,
			...(item.url ? { item: getAbsoluteUrl(item.url) } : {}),
		})),
	};
}
