import { z } from 'zod';

const SavedViewportSchema = z.object({
	longitude: z.number(),
	latitude: z.number(),
	zoom: z.number(),
});

type SavedViewport = z.infer<typeof SavedViewportSchema>;

function getViewportStorageKey(mapId: string) {
	return `map-vp:${mapId}`;
}

export function readSavedViewport(mapId: string | undefined): SavedViewport | undefined {
	if (!mapId) return;

	try {
		const raw = sessionStorage.getItem(getViewportStorageKey(mapId));
		if (!raw) return;

		const result = SavedViewportSchema.safeParse(JSON.parse(raw));

		return result.success ? result.data : undefined;
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
