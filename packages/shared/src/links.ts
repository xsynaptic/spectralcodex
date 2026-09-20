export type ContentLink = string | { url: string };

// Normalized once per content entry; the predicate below reruns against every resource
export function getLinkUrls(links: Array<ContentLink> | undefined): Array<string> {
	if (!links) return [];

	return links.map((link) => (typeof link === 'string' ? link : link.url));
}

export function isLinkUrlMatch(
	linkUrl: string,
	matchPattern: Array<string> | string | undefined,
): boolean {
	if (!matchPattern) return false;

	if (typeof matchPattern === 'string') {
		return linkUrl.includes(matchPattern);
	}

	return matchPattern.some((pattern) => linkUrl.includes(pattern));
}
