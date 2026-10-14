import type { MapHostIntent } from '@spectralcodex/react-map-component';

import type { AtlasScreen } from '#lib/atlas/atlas-layout-factory.ts';

import { atlasSheetRest } from '#lib/atlas/atlas-constants.ts';

export interface AtlasOpenInput {
	intent: MapHostIntent;
	pathname: string;
	screen: AtlasScreen;
}

export function getAtlasOpenAction({ intent, pathname, screen }: AtlasOpenInput) {
	if (intent.kind === 'open' && intent.url !== pathname) {
		return { type: 'navigate', url: intent.url } as const;
	}

	const rest = screen.layout === 'sheet' ? screen.rest : undefined;

	if (rest === atlasSheetRest.down) return { type: 'raise' } as const;
	if (rest === atlasSheetRest.half) return { type: 'start' } as const;

	if (intent.kind === 'target' && intent.hasPopup) return { type: 'none' } as const;

	return { type: 'top' } as const;
}
