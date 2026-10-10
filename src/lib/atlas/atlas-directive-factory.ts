// Serialized into the `client:atlas` value; a directive takes one string
export interface AtlasDirectiveOptions {
	css: string;
	mediaQuery: string;
}

export interface AtlasDirectiveState {
	hasFlag: boolean;
	isPaneMatch: boolean;
	page: string | undefined;
}

// `/atlas` shows the map at every width; beside a pane it shows only where the pane query matches
// On any other page a persisted shell stays hidden
export function shouldHydrateAtlas({ hasFlag, isPaneMatch, page }: AtlasDirectiveState) {
	return hasFlag && (page === 'map' || (page === 'pane' && isPaneMatch));
}
