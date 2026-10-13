import type { MapHostIntent } from '@spectralcodex/react-map-component';

export interface AtlasOpenInput {
	intent: MapHostIntent;
	pathname: string;
	// The Split counts as raised
	sheet: 'down' | 'raised';
}

export function getAtlasOpenAction({ intent, pathname, sheet }: AtlasOpenInput) {
	if (intent.kind === 'open' && intent.url !== pathname) {
		return { type: 'navigate', url: intent.url } as const;
	}

	if (sheet === 'down') return { type: 'raise' } as const;

	// The Pane is in view, so a Target with a popup of its own keeps the click
	if (intent.kind === 'target' && intent.hasPopup) return { type: 'none' } as const;

	return { type: 'top' } as const;
}
