import type { ViewState } from 'react-map-gl/maplibre';

type SavedViewport = Pick<ViewState, 'longitude' | 'latitude' | 'zoom'>;

function getViewportStorageKey(mapId: string) {
	return `map-vp:${mapId}`;
}

export function readSavedViewport(mapId: string | undefined): SavedViewport | undefined {
	if (!mapId) return;

	try {
		const raw = sessionStorage.getItem(getViewportStorageKey(mapId));
		if (!raw) return;

		const parsed: unknown = JSON.parse(raw);

		if (
			parsed &&
			typeof parsed === 'object' &&
			'longitude' in parsed &&
			'latitude' in parsed &&
			'zoom' in parsed &&
			typeof parsed.longitude === 'number' &&
			typeof parsed.latitude === 'number' &&
			typeof parsed.zoom === 'number'
		) {
			return parsed as SavedViewport;
		}
	} catch {
		// Ignore parse errors or missing sessionStorage
	}
	return undefined;
}

export function writeSavedViewport(mapId: string, viewport: SavedViewport) {
	try {
		sessionStorage.setItem(getViewportStorageKey(mapId), JSON.stringify(viewport));
	} catch {
		// Ignore quota errors
	}
}
