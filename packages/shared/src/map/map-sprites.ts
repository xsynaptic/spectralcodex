// Define any icons used in the map component in this file
// Note: the viewbox attribute needs to be copied in-line to wherever the sprite is being displayed
export const MapSpritesEnum = {
	Clusters: 'uil:expand-arrows-alt',
	Copy: 'uil:copy',
	Filters: 'uil:layer-group',
	Google: 'logos:google-maps',
	Rating: 'clarity:star-solid',
	Search: 'uil:search',
	Warning: 'clarity:warning-solid',
	Wikipedia: 'hugeicons:wikipedia',
} as const satisfies Record<string, string>;
