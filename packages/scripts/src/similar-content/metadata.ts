export interface SimilarContentMetadata {
	themes: Array<string>;
	regions: Array<string>;
}

// Data-store taxonomy references are {id, collection} objects; extract the id
export function toReferenceIdArray(value: unknown): Array<string> {
	if (!Array.isArray(value)) return [];

	const ids: Array<string> = [];

	for (const item of value) {
		if (typeof item === 'string') {
			ids.push(item);
		} else if (item && typeof item === 'object' && 'id' in item) {
			ids.push(String((item as { id: unknown }).id));
		}
	}

	return ids;
}

const boostTheme = 0.15; // weight per shared theme
const boostRegion = 0.1; // weight per shared region
const boostLimit = 0.3; // ceiling on the combined boost

/**
 * Boost from shared taxonomy
 */
export function calculateMetadataBoost(
	current: { metadata: SimilarContentMetadata },
	other: { metadata: SimilarContentMetadata },
): number {
	const currentThemes = new Set(current.metadata.themes);
	const sharedThemes = other.metadata.themes.filter((theme) => currentThemes.has(theme));

	const currentRegions = new Set(current.metadata.regions);
	const sharedRegions = other.metadata.regions.filter((region) => currentRegions.has(region));

	const boost = sharedThemes.length * boostTheme + sharedRegions.length * boostRegion;

	return Math.min(boost, boostLimit);
}
