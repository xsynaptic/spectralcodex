// Each region id to its parent id; `undefined` marks a root region
export type RegionParentMap = Map<string, string | undefined>;

// References are stored as `{id, collection}`; non-reference input reads as empty, like an absent field
export function toReferenceIds(value: unknown): Array<string> {
	if (!Array.isArray(value)) return [];

	const ids: Array<string> = [];

	// Array.isArray narrows unknown to any[], which defeats the checks below
	for (const item of value as Array<unknown>) {
		if (item === null || typeof item !== 'object') continue;

		const { id } = item as { id?: unknown };

		if (typeof id === 'string') ids.push(id);
	}

	return ids;
}

// Scripts-only on purpose; the app derives ancestry from its nested-set Hierarchy over enriched collections
// Ancestors from root down to the region itself: [0] = root, [last] = regionId
export function getRegionParentsById(
	regionId: string | undefined,
	parentMap: RegionParentMap,
): Array<string> {
	if (!regionId) return [];

	const chain: Array<string> = [regionId];
	let parent = parentMap.get(regionId);

	while (parent !== undefined) {
		chain.push(parent);
		parent = parentMap.get(parent);
	}
	return chain.toReversed();
}
