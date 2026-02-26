import { cacheFileExists } from '@spectralcodex/shared/cache';
import { OPEN_GRAPH_IMAGE_FORMAT, OPEN_GRAPH_BASE_PATH } from '@spectralcodex/shared/constants';
import { CUSTOM_CACHE_PATH } from 'astro:env/server';
import path from 'node:path';
import * as R from 'remeda';
import urlJoin from 'url-join';

import { OPEN_GRAPH_IMAGE_FALLBACK_COUNT, OPEN_GRAPH_IMAGE_FALLBACK_PREFIX } from '#constants.ts';
import { parseContentDate } from '#lib/utils/date.ts';
import { logError } from '#lib/utils/logging.ts';

const { BASE_URL, PROD, SITE } = import.meta.env;

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

export async function getSeoImageProps({ id, alt }: { id?: string; alt: string }) {
	if (!id) {
		return { url: getSeoImageFallback(), alt };
	}

	const filename = `${id.replace('/', '-')}.${OPEN_GRAPH_IMAGE_FORMAT}`;
	const cachePath = path.join(CUSTOM_CACHE_PATH, 'og-image', filename);

	const fileExists = await cacheFileExists(cachePath);

	if (!fileExists) {
		logError(`[OG Image] Missing: ${filename}`);
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
