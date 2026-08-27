import { z } from 'zod';

import type { MapComponentProps, MapInitialViewState } from '../types';

const staleTimeMs = 30 * 60 * 1000;
const defaultZoom = 12;
const fitBoundsOptions = { padding: { top: 20, bottom: 20, left: 50, right: 50 } };

const SavedViewportSchema = z.object({
	longitude: z.number(),
	latitude: z.number(),
	zoom: z.number(),
	timestamp: z.number(),
});

type SavedViewport = Pick<z.infer<typeof SavedViewportSchema>, 'longitude' | 'latitude' | 'zoom'>;

function getViewportStorageKey(mapId: string) {
	return `map-vp:${mapId}`;
}

function readSavedViewport(mapId: string | undefined): SavedViewport | undefined {
	if (!mapId) return;

	try {
		const raw = sessionStorage.getItem(getViewportStorageKey(mapId));

		if (!raw) return;

		const result = SavedViewportSchema.safeParse(JSON.parse(raw));

		if (!result.success) return;

		if (Date.now() - result.data.timestamp > staleTimeMs) return;

		return result.data;
	} catch {
		// Ignore parse errors or missing sessionStorage
	}
	return undefined;
}

export function writeSavedViewport(mapId: string, viewport: SavedViewport) {
	try {
		sessionStorage.setItem(
			getViewportStorageKey(mapId),
			JSON.stringify({ ...viewport, timestamp: Date.now() }),
		);
	} catch {
		// Ignore quota errors
	}
}

interface InitialViewStateOptions {
	bounds?: MapComponentProps['bounds'] | undefined;
	center?: MapComponentProps['center'] | undefined;
	mapId?: MapComponentProps['mapId'] | undefined;
	maxBounds?: MapComponentProps['maxBounds'] | undefined;
	zoom?: MapComponentProps['zoom'] | undefined;
}

export function getInitialViewState({
	bounds,
	center,
	mapId,
	maxBounds,
	zoom,
}: InitialViewStateOptions): NonNullable<MapInitialViewState> {
	const maxBoundsOption = maxBounds ? { maxBounds } : {};
	const saved = readSavedViewport(mapId);

	if (saved) return { ...maxBoundsOption, ...saved };

	const viewState = { ...maxBoundsOption, fitBoundsOptions, zoom: zoom ?? defaultZoom };

	if (bounds) return { ...viewState, bounds };

	const [longitude, latitude] = center ?? [0, 0];

	return { ...viewState, longitude, latitude };
}
