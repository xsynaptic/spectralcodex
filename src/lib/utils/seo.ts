import { openGraphImageFormat, openGraphBasePath } from '@spectralcodex/shared/constants';
import * as R from 'remeda';

import { openGraphImageFallbackCount, openGraphImageFallbackPrefix } from '#constants.ts';
import { joinUrl } from '#lib/utils/routing.ts';

const { BASE_URL, PROD, SITE } = import.meta.env;

// Generate some common props for posts and post-like content
export function getSeoArticleProps({
	dateCreated,
	dateUpdated,
}: {
	dateCreated: Date;
	dateUpdated: Date | undefined;
}) {
	const publishedTime = dateCreated.toISOString();
	const modifiedTime = dateUpdated?.toISOString();

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
	return joinUrl(
		PROD ? SITE : BASE_URL,
		`${openGraphImageFallbackPrefix}-${String(R.randomInteger(1, openGraphImageFallbackCount))}.${openGraphImageFormat}`,
	);
}

export function getSeoImageProps({ id, alt }: { id?: string; alt: string }) {
	if (id) {
		const filename = `${id.replace('/', '-')}.${openGraphImageFormat}`;

		return {
			url: joinUrl(PROD ? SITE : BASE_URL, openGraphBasePath, filename),
			alt,
		};
	}

	return { url: getSeoImageFallback(), alt };
}

export function getSeoHideSearch(shouldHide: boolean | undefined) {
	return shouldHide
		? {
				noIndex: true,
				noFollow: true,
			}
		: undefined;
}
