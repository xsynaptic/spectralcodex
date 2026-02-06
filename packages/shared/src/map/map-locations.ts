/**
 * Note: these enums are duplicated into the main project due to an Astro/Vite bug
 * Because the location collection config uses these enums in the schema it must appear in both spaces
 */
export const LocationCategoryEnum = {
	/** Civic */
	Civic: 'civic',
	Cemetery: 'cemetery',
	Government: 'government',
	Health: 'health',
	Library: 'library',
	Museum: 'museum',
	Park: 'park',
	Police: 'police',
	Prison: 'prison',
	PublicArt: 'public-art',
	School: 'school',
	Viewpoint: 'viewpoint',
	Water: 'water', // Should relate to water supply technology
	/** Commercial */
	Commercial: 'commercial',
	Hotel: 'hotel',
	Market: 'market',
	NightMarket: 'night-market',
	Shophouse: 'shophouse',
	Theater: 'theater',
	ThemePark: 'theme-park',
	/** Food and drink  */
	Cafe: 'cafe',
	Restaurant: 'restaurant',
	/** Historic */
	Historic: 'historic',
	Monument: 'monument',
	Site: 'site',
	/** Industrial */
	Industrial: 'industrial',
	Factory: 'factory',
	Forestry: 'forestry',
	Granary: 'granary',
	Kiln: 'kiln',
	Mining: 'mining',
	Power: 'power',
	Salt: 'salt',
	Tobacco: 'tobacco',
	Warehouse: 'warehouse',
	/** Infrastructure */
	Infrastructure: 'infrastructure',
	Dam: 'dam',
	Lighthouse: 'lighthouse',
	/** Military */
	Military: 'military',
	Base: 'base',
	Fortification: 'fortification',
	/** Natural */
	Natural: 'natural',
	Beach: 'beach',
	Cave: 'cave',
	Forest: 'forest',
	HotSpring: 'hot-spring',
	Tree: 'tree',
	Waterfall: 'waterfall',
	/** Religious */
	Religious: 'religious',
	AncestralHall: 'ancestral-hall',
	Buddhist: 'buddhist',
	Christian: 'christian',
	Indigenous: 'indigenous',
	Jewish: 'jewish',
	Muslim: 'muslim',
	Shinto: 'shinto',
	Temple: 'temple',
	/** Transportation */
	Transportation: 'transportation',
	Airport: 'airport',
	Bridge: 'bridge',
	Railway: 'railway',
	Road: 'road',
	Seaport: 'seaport',
	Tunnel: 'tunnel',
	/** Various */
	Building: 'building',
	Community: 'community',
	Residence: 'residence',
	Other: 'other',
	Unknown: 'unknown',
} as const satisfies Record<string, string>;

export type LocationCategory = (typeof LocationCategoryEnum)[keyof typeof LocationCategoryEnum];

export const LocationCategoryNumericMapping = Object.fromEntries(
	Object.values(LocationCategoryEnum).map((value, i) => [value, i]),
) as Record<(typeof LocationCategoryEnum)[keyof typeof LocationCategoryEnum], number>;

export const LocationStatusEnum = {
	Operational: 'operational',
	Public: 'public',
	Private: 'private',
	Restored: 'restored',
	Converted: 'converted',
	Idle: 'idle',
	Abandoned: 'abandoned',
	Remnants: 'remnants',
	Demolished: 'demolished',
	Unknown: 'unknown',
} as const satisfies Record<string, string>;

export type LocationStatus = (typeof LocationStatusEnum)[keyof typeof LocationStatusEnum];

export const LocationLayerEnum = {
	Light: 'light',
	Neutral: 'neutral',
	Dark: 'dark',
} as const satisfies Record<string, string>;

export type LocationLayer = (typeof LocationLayerEnum)[keyof typeof LocationLayerEnum];

export const LocationStatusNumericMapping = Object.fromEntries(
	Object.values(LocationStatusEnum).map((value, i) => [value, i]),
) as Record<(typeof LocationStatusEnum)[keyof typeof LocationStatusEnum], number>;
