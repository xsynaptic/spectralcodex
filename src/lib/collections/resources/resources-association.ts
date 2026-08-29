// Structural shapes, so collection entries and plain test literals both satisfy them
interface ResourceLike {
	id: string;
	data: {
		match?: string | Array<string> | undefined;
	};
}

interface ContentLike {
	id: string;
	data: {
		links?: Array<string | { url: string }> | undefined;
		sources?: Array<string | object> | undefined;
	};
}

export interface ResourceAssociation {
	locationIdsByResourceId: Map<string, Array<string>>;
	postIdsByResourceId: Map<string, Array<string>>;
}

export function isLinkUrlMatch(
	linkUrl: string,
	matchPattern: string | Array<string> | undefined,
): boolean {
	if (!matchPattern) return false;

	if (typeof matchPattern === 'string') {
		return linkUrl.includes(matchPattern);
	}

	return matchPattern.some((pattern) => linkUrl.includes(pattern));
}

// Normalized once per content entry; the predicate below reruns against every resource
function getLinkUrls(links: ContentLike['data']['links']): Array<string> {
	if (!links) return [];

	return links.map((link) => (typeof link === 'string' ? link : link.url));
}

// Object-form sources are resources written inline; only string sources reference a resource entry
function getSourceIds(sources: ContentLike['data']['sources']): Set<string> {
	if (!sources) return new Set<string>();

	return new Set(sources.filter((source) => typeof source === 'string'));
}

// Entry identity across raw and enriched reads is not guaranteed; IDs resolve via entriesMap
// Array order follows content-collection order, which the per-resource scans this replaced produced
export function buildResourceAssociation(
	resources: ReadonlyArray<ResourceLike>,
	locations: ReadonlyArray<ContentLike>,
	posts: ReadonlyArray<ContentLike>,
): ResourceAssociation {
	const locationIdsByResourceId = new Map<string, Array<string>>();
	const postIdsByResourceId = new Map<string, Array<string>>();

	for (const resource of resources) {
		locationIdsByResourceId.set(resource.id, []);
		postIdsByResourceId.set(resource.id, []);
	}

	function collectContentIds(
		content: ReadonlyArray<ContentLike>,
		idsByResourceId: Map<string, Array<string>>,
	) {
		for (const entry of content) {
			const linkUrls = getLinkUrls(entry.data.links);
			const sourceIds = getSourceIds(entry.data.sources);

			if (linkUrls.length === 0 && sourceIds.size === 0) continue;

			for (const resource of resources) {
				const hasLinkMatch = linkUrls.some((linkUrl) =>
					isLinkUrlMatch(linkUrl, resource.data.match),
				);

				if (hasLinkMatch || sourceIds.has(resource.id)) {
					idsByResourceId.get(resource.id)?.push(entry.id);
				}
			}
		}
	}

	collectContentIds(locations, locationIdsByResourceId);
	collectContentIds(posts, postIdsByResourceId);

	return { locationIdsByResourceId, postIdsByResourceId };
}
