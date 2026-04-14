import { assembleGraph, buildWebSite, makeIds } from '@jdevalk/seo-graph-core';

import type { GraphEntity } from '#components/types.ts';

import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { getSiteUrl } from '#lib/utils/routing.ts';
import { sanitizeDescription } from '#lib/utils/text.ts';

const siteUrl = getSiteUrl();
const aboutUrl = getSiteUrl('/about');

const ids = makeIds({
	siteUrl: siteUrl.replace(/\/$/, ''),
	personUrl: aboutUrl.endsWith('/') ? aboutUrl : `${aboutUrl}/`,
});

export function buildWebSiteSchema(): GraphEntity {
	const t = getTranslations();

	// buildWebSite returns Record<string, unknown> but always sets @type internally.
	return buildWebSite(
		{
			name: t('site.title'),
			url: siteUrl,
			description: t('site.description'),
			publisher: { '@id': ids.person },
		},
		ids,
	) as GraphEntity;
}

export function buildAuthorSchema(): GraphEntity {
	const t = getTranslations();

	return {
		'@type': 'Person',
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
}): GraphEntity {
	const description = sanitizeDescription(props.description);

	return {
		'@type': 'Article',
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
): GraphEntity {
	// buildBreadcrumbList wraps the last item's url as a WebPage @id reference
	// Here in this project we use the flat URL format instead
	return {
		'@type': 'BreadcrumbList',
		'@id': ids.breadcrumb(pageUrl),
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
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
}): GraphEntity {
	const description = sanitizeDescription(props.description);

	return {
		'@type': 'Place',
		'@id': `${props.url}#place`,
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

/**
 * Assemble and serialize a page's graph pieces for injection via script tag
 * Warns at build time on unresolved `@id` references
 * Escapes `<`, `>`, `&` to prevent breaking out of the script tag
 */
export function serializeGraph(entities: ReadonlyArray<GraphEntity>): string {
	const graph = assembleGraph(entities, { warnOnDanglingReferences: true });

	return JSON.stringify(graph)
		.replaceAll('<', String.raw`\u003c`)
		.replaceAll('>', String.raw`\u003e`)
		.replaceAll('&', String.raw`\u0026`);
}
