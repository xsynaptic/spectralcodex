import { z } from 'zod';

const STALE_TIME_MS = 30 * 60 * 1000;

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

export function readSavedViewport(mapId: string | undefined): SavedViewport | undefined {
	if (!mapId) return;

	try {
		const raw = sessionStorage.getItem(getViewportStorageKey(mapId));

		if (!raw) return;

		const result = SavedViewportSchema.safeParse(JSON.parse(raw));

		if (!result.success) return;

		if (Date.now() - result.data.timestamp > STALE_TIME_MS) return;

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
