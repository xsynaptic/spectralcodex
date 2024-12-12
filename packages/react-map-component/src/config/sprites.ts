// Define any icons used in the map component in this file
// Note 1: DO NOT import anything else (to avoid issues with bundling non-client-side code)
// Note 2: the viewbox attribute needs to be copied in-line to wherever the sprite is being displayed
export const MapSpritesEnum = {
	Google: 'logos:google-maps',
	Wikipedia: 'hugeicons:wikipedia',
	Copy: 'uil:copy',
	Filters: 'uil:layer-group',
	Clusters: 'uil:expand-arrows-alt',
	Rating: 'clarity:star-solid',
	Warning: 'clarity:warning-solid',
} as const satisfies Record<string, string>;
