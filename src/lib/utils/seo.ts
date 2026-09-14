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
		article: {
			publishedTime,
			...(modifiedTime ? { modifiedTime } : {}),
		},
		ogType: 'article' as const,
	};
}

export function getSeoHideSearch(shouldHide: boolean | undefined) {
	return shouldHide
		? {
				noFollow: true,
				noIndex: true,
			}
		: undefined;
}

export function getSeoImageProps({ alt, id }: { alt: string; id: string }) {
	return {
		alt,
		url: getAbsoluteUrl(getBasePath(getOpenGraphPath(id))),
	};
}
