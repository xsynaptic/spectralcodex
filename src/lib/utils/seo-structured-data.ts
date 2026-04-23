import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { getSiteUrl } from '#lib/utils/routing.ts';
import { sanitizeSeoDescription } from '#lib/utils/seo.ts';

const SchemaTypeEnum = {
	Article: 'Article',
	BreadcrumbList: 'BreadcrumbList',
	GeoCoordinates: 'GeoCoordinates',
	ListItem: 'ListItem',
	Person: 'Person',
	Place: 'Place',
	WebSite: 'WebSite',
} as const;

// Schema.org entity types adapted from schema-dts, pared down to what this project emits
interface IdReference {
	'@id': string;
}

interface Article extends IdReference {
	'@type': (typeof SchemaTypeEnum)['Article'];
	headline: string;
	description?: string;
	image?: string;
	datePublished: string;
	dateModified?: string;
	author: IdReference;
}

interface BreadcrumbList extends IdReference {
	'@type': (typeof SchemaTypeEnum)['BreadcrumbList'];
	itemListElement: Array<{
		'@type': 'ListItem';
		position: number;
		name: string;
		item?: string;
	}>;
}

interface Person extends IdReference {
	'@type': (typeof SchemaTypeEnum)['Person'];
	name: string;
	url: string;
}

interface Place extends IdReference {
	'@type': (typeof SchemaTypeEnum)['Place'];
	name: string;
	description?: string;
	url: string;
	geo?: {
		'@type': (typeof SchemaTypeEnum)['GeoCoordinates'];
		latitude: number;
		longitude: number;
	};
}

interface WebSite extends IdReference {
	'@type': (typeof SchemaTypeEnum)['WebSite'];
	url: string;
	name: string;
	publisher: IdReference;
	description: string;
}

export type Thing = Article | BreadcrumbList | Person | Place | WebSite;

interface Graph {
	'@context': 'https://schema.org';
	'@graph': ReadonlyArray<Thing>;
}

const siteUrl = getSiteUrl();
const aboutUrl = getSiteUrl('/about');

// @id scheme: long form for singletons, short fragment for per-page entities
const ids = {
	website: `${siteUrl}#/schema.org/${SchemaTypeEnum.WebSite}`,
	person: `${aboutUrl}#/schema.org/${SchemaTypeEnum.Person}`,
	article: (pageUrl: string) => `${pageUrl}#article`,
	breadcrumb: (pageUrl: string) => `${pageUrl}#breadcrumb`,
	place: (pageUrl: string) => `${pageUrl}#place`,
};

export function buildWebSiteSchema(): WebSite {
	const t = getTranslations();

	return {
		'@type': SchemaTypeEnum.WebSite,
		'@id': ids.website,
		url: siteUrl,
		name: t('site.title'),
		publisher: { '@id': ids.person },
		description: t('site.description'),
	};
}

export function buildAuthorSchema(): Person {
	const t = getTranslations();

	return {
		'@type': SchemaTypeEnum.Person,
		'@id': ids.person,
		name: t('author.name'),
		url: aboutUrl,
	};
}

export function buildArticleSchema(props: {
	title: string;
	description: string | undefined;
	dateCreated: Date;
	dateUpdated: Date | undefined;
	url: string;
	imageUrl: string | undefined;
}): Article {
	const description = sanitizeSeoDescription(props.description);

	return {
		'@type': SchemaTypeEnum.Article,
		'@id': ids.article(props.url),
		headline: props.title,
		...(description ? { description } : {}),
		...(props.imageUrl ? { image: props.imageUrl } : {}),
		datePublished: props.dateCreated.toISOString(),
		...(props.dateUpdated ? { dateModified: props.dateUpdated.toISOString() } : {}),
		author: { '@id': ids.person },
	};
}

export function buildBreadcrumbSchema(
	items: ReadonlyArray<{ name: string; url?: string }>,
	pageUrl: string,
): BreadcrumbList {
	return {
		'@type': SchemaTypeEnum.BreadcrumbList,
		'@id': ids.breadcrumb(pageUrl),
		itemListElement: items.map((item, index) => ({
			'@type': SchemaTypeEnum.ListItem,
			position: index + 1,
			name: item.name,
			...(item.url ? { item: item.url } : {}),
		})),
	};
}

export function buildPlaceSchema(props: {
	title: string;
	description: string | undefined;
	url: string;
	coordinates: [number, number] | undefined;
}): Place {
	const description = sanitizeSeoDescription(props.description);

	return {
		'@type': SchemaTypeEnum.Place,
		'@id': ids.place(props.url),
		name: props.title,
		...(description ? { description } : {}),
		url: props.url,
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
