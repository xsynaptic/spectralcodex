import { z } from 'zod';

import type { MapComponentProps, MapInitialViewState } from '#types.ts';

import { mapViewportStorageKeyPrefix } from '#constants.ts';

const staleTimeMs = 2 * 60 * 60 * 1000;
const defaultZoom = 12;
const fitBoundsOptions = { padding: { bottom: 20, left: 50, right: 50, top: 20 } };

const SavedViewportSchema = z.object({
	latitude: z.number(),
	longitude: z.number(),
	timestamp: z.number(),
	zoom: z.number(),
});

interface InitialViewStateOptions {
	bounds?: MapComponentProps['bounds'] | undefined;
	center?: MapComponentProps['center'] | undefined;
	mapId?: MapComponentProps['mapId'] | undefined;
	maxBounds?: MapComponentProps['maxBounds'] | undefined;
	zoom?: MapComponentProps['zoom'] | undefined;
}

type SavedViewport = Pick<z.infer<typeof SavedViewportSchema>, 'latitude' | 'longitude' | 'zoom'>;

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

	return { ...viewState, latitude, longitude };
}

export function writeSavedViewport(mapId: string, viewport: SavedViewport) {
	try {
		sessionStorage.setItem(
			getViewportStorageKey(mapId),
			JSON.stringify({ ...viewport, timestamp: Date.now() }),
		);
	} catch {
		// Storage can be full or blocked
	}
}

function getViewportStorageKey(mapId: string) {
	return `${mapViewportStorageKeyPrefix}${mapId}`;
}

function readSavedViewport(mapId: string | undefined): SavedViewport | undefined {
	if (!mapId) return;

	try {
		const raw = sessionStorage.getItem(getViewportStorageKey(mapId));

		return raw ? parseSavedViewport(raw, Date.now()) : undefined;
	} catch {
		return undefined;
	}
}

function parseSavedViewport(raw: string, nowMs: number): SavedViewport | undefined {
	const result = SavedViewportSchema.safeParse(JSON.parse(raw));

	if (!result.success) return;

	if (nowMs - result.data.timestamp > staleTimeMs) return;

	const { latitude, longitude, zoom } = result.data;

	return { latitude, longitude, zoom };
}
