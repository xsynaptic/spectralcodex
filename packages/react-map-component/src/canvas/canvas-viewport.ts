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

// `sessionStorage` is read inside each `try`; touching the global throws where storage is blocked
interface ViewportStore {
	now?: (() => number) | undefined;
	storage?: undefined | ViewportStorage;
}

interface ViewportStorage {
	getItem: (key: string) => ReturnType<Storage['getItem']> | undefined;
	setItem: Storage['setItem'];
}

export function getInitialViewState(
	{ bounds, center, mapId, maxBounds, zoom }: InitialViewStateOptions,
	store?: ViewportStore,
): NonNullable<MapInitialViewState> {
	const maxBoundsOption = maxBounds ? { maxBounds } : {};
	const saved = readSavedViewport(mapId, store);

	if (saved) return { ...maxBoundsOption, ...saved };

	const viewState = { ...maxBoundsOption, fitBoundsOptions, zoom: zoom ?? defaultZoom };

	if (bounds) return { ...viewState, bounds };

	const [longitude, latitude] = center ?? [0, 0];

	return { ...viewState, latitude, longitude };
}

export function writeSavedViewport(
	mapId: string,
	viewport: SavedViewport,
	{ now = Date.now, storage }: ViewportStore = {},
) {
	try {
		(storage ?? sessionStorage).setItem(
			getViewportStorageKey(mapId),
			JSON.stringify({ ...viewport, timestamp: now() }),
		);
	} catch {
		// Ignore quota errors
	}
}

function getViewportStorageKey(mapId: string) {
	return `${mapViewportStorageKeyPrefix}${mapId}`;
}

export function readSavedViewport(
	mapId: string | undefined,
	{ now = Date.now, storage }: ViewportStore = {},
): SavedViewport | undefined {
	if (!mapId) return;

	try {
		const raw = (storage ?? sessionStorage).getItem(getViewportStorageKey(mapId));

		return raw ? parseSavedViewport(raw, now()) : undefined;
	} catch {
		// Ignore parse errors or missing sessionStorage
	}
	return undefined;
}

function parseSavedViewport(raw: string, nowMs: number): SavedViewport | undefined {
	const result = SavedViewportSchema.safeParse(JSON.parse(raw));

	if (!result.success) return;

	if (nowMs - result.data.timestamp > staleTimeMs) return;

	const { latitude, longitude, zoom } = result.data;

	return { latitude, longitude, zoom };
}
