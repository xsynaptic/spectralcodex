import { getOpenGraphPath } from '@spectralcodex/shared/open-graph';

import { getAbsoluteUrl, getBasePath } from '#lib/utils/routing.ts';

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

export function getSeoHideSearch(shouldHide: boolean | undefined) {
	return shouldHide
		? {
				noIndex: true,
				noFollow: true,
			}
		: undefined;
}

export function getSeoImageProps({ id, alt }: { alt: string; id: string }) {
	return {
		url: getAbsoluteUrl(getBasePath(getOpenGraphPath(id))),
		alt,
	};
}
