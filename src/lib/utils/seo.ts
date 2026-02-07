import { cacheFileExists } from '@spectralcodex/shared/cache';
import { OPEN_GRAPH_IMAGE_FORMAT, OPEN_GRAPH_BASE_PATH } from '@spectralcodex/shared/constants';
import { stripTags, transformMarkdown } from '@xsynaptic/unified-tools';
import { CUSTOM_CACHE_PATH } from 'astro:env/server';
import path from 'node:path';
import * as R from 'remeda';
import urlJoin from 'url-join';

import {
	MDX_COMPONENTS_TO_STRIP,
	OPEN_GRAPH_IMAGE_FALLBACK_COUNT,
	OPEN_GRAPH_IMAGE_FALLBACK_PREFIX,
} from '#constants.ts';
import { parseContentDate } from '#lib/utils/date.ts';
import { stripMdxComponents, textClipper } from '#lib/utils/text.ts';

const { BASE_URL, PROD, SITE } = import.meta.env;

// Strip footnote references from text (*e.g.*, [^1], [^foo], [^123])
function stripFootnoteReferences(input: string) {
	return input.replaceAll(/\[\^[^\]]+\]/g, '');
}

// Simple text-only SEO description that accepts a variety of things you might throw at it
export function getSeoDescription(description: string | undefined) {
	return description
		? R.pipe(
				description,
				stripFootnoteReferences,
				(description) => stripMdxComponents(description, MDX_COMPONENTS_TO_STRIP),
				(description) => transformMarkdown({ input: description }),
				stripTags,
				(stripped) => textClipper(stripped, { wordCount: 100 }),
			)
		: undefined;
}

// Generate some common props for posts and post-like content
export function getSeoArticleProps({
	dateCreated,
	dateUpdated,
}: {
	dateCreated: Date;
	dateUpdated: Date | undefined;
}) {
	const publishedTime = parseContentDate(dateCreated)?.toISOString() ?? '';
	const modifiedTime = parseContentDate(dateUpdated)?.toISOString();

	return {
		ogType: 'article' as const,
		article: {
			publishedTime,
			...(modifiedTime ? { modifiedTime } : {}),
		},
	};
}

// These fallback images should already exist in the public folder
export function getSeoImageFallback() {
	return urlJoin(
		PROD ? SITE : BASE_URL,
		`${OPEN_GRAPH_IMAGE_FALLBACK_PREFIX}-${String(R.randomInteger(1, OPEN_GRAPH_IMAGE_FALLBACK_COUNT))}.${OPEN_GRAPH_IMAGE_FORMAT}`,
	);
}

export async function getSeoImageProps({ id, alt }: { id: string; alt: string }) {
	const filename = `${id}.${OPEN_GRAPH_IMAGE_FORMAT}`;
	const cachePath = path.join(CUSTOM_CACHE_PATH, 'og-image-output', filename);

	const fileExists = await cacheFileExists(cachePath);

	if (!fileExists) {
		console.warn(`[OG Image] Missing: ${filename}`);
	}

	return {
		url: urlJoin(PROD ? SITE : BASE_URL, OPEN_GRAPH_BASE_PATH, filename),
		alt,
	};
}

export function getSeoHideSearch(shouldHide: boolean | undefined) {
	return shouldHide
		? {
				noIndex: true,
				noFollow: true,
			}
		: undefined;
}
