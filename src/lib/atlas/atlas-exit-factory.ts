export interface AtlasExitInput {
	// An earlier entry in this tab on this site; false where the Navigation API is missing
	canGoBack: boolean;
	homePath: string;
	// The last regular page seen this session
	returnPath: string | undefined;
}

// Leaving the full-screen map must not grow history; back when there is somewhere to go back to
export function getAtlasExitAction({ canGoBack, homePath, returnPath }: AtlasExitInput) {
	if (canGoBack) return { type: 'back' } as const;

	return { path: returnPath ?? homePath, type: 'replace' } as const;
}
