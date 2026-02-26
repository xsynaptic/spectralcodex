import type { Article, BreadcrumbList, Place, Thing, WithContext } from 'schema-dts';

import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { getSiteUrl } from '#lib/utils/routing.ts';
import { sanitizeDescription } from '#lib/utils/text.ts';

// Safely serialize JSON-LD for embedding in <script> tags
// Unicode escapes prevent XSS
export function serializeSchema(data: WithContext<Thing>) {
	return JSON.stringify(data)
		.replaceAll('<', String.raw`\u003c`)
		.replaceAll('>', String.raw`\u003e`)
		.replaceAll('&', String.raw`\u0026`);
}

export function buildBreadcrumbSchema(
	items: Array<{ name: string; url?: string }>,
): WithContext<BreadcrumbList> {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem' as const,
			position: index + 1,
			name: item.name,
			...(item.url ? { item: item.url } : {}),
		})),
	};
}

export function buildArticleSchema(props: {
	title: string;
	description: string | undefined;
	dateCreated: Date;
	dateUpdated: Date | undefined;
	url: string;
	imageUrl: string | undefined;
}): WithContext<Article> {
	const t = getTranslations();
	const description = sanitizeDescription(props.description);

	return {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: props.title,
		...(description ? { description } : {}),
		...(props.imageUrl ? { image: props.imageUrl } : {}),
		datePublished: props.dateCreated.toISOString(),
		...(props.dateUpdated ? { dateModified: props.dateUpdated.toISOString() } : {}),
		author: {
			'@type': 'Person',
			name: t('author.name'),
			url: getSiteUrl(),
		},
		mainEntityOfPage: {
			'@type': 'WebPage',
			'@id': props.url,
		},
	};
}

export function buildPlaceSchema(props: {
	title: string;
	description: string | undefined;
	url: string;
	coordinates: [number, number] | undefined;
}): WithContext<Place> {
	const description = sanitizeDescription(props.description);

	return {
		'@context': 'https://schema.org',
		'@type': 'Place',
		name: props.title,
		...(description ? { description } : {}),
		url: props.url,
		...(props.coordinates
			? {
					geo: {
						'@type': 'GeoCoordinates',
						latitude: props.coordinates[1],
						longitude: props.coordinates[0],
					},
				}
			: {}),
	};
}
