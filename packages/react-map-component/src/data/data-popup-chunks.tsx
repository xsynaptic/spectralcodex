import type { MapPopupItem } from '@spectralcodex/map-codec';
import type { FC, ReactNode } from 'react';

import { MapPopupItemSchema } from '@spectralcodex/map-codec';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext } from 'react';

import { FETCH_TIMEOUT_MS } from '../constants';

interface ChunkConfig {
	chunkUrlBase: string | undefined;
	version: string | undefined;
	isDev: boolean | undefined;
}

const ChunkConfigContext = createContext<ChunkConfig>({
	chunkUrlBase: undefined,
	version: undefined,
	isDev: undefined,
});

export const ChunkConfigProvider: FC<ChunkConfig & { children: ReactNode }> =
	function ChunkConfigProvider({ chunkUrlBase, version, isDev, children }) {
		return (
			<ChunkConfigContext.Provider value={{ chunkUrlBase, version, isDev }}>
				{children}
			</ChunkConfigContext.Provider>
		);
	};

function parseChunk(raw: unknown): Array<MapPopupItem> {
	const result = MapPopupItemSchema.array().safeParse(raw);

	if (!result.success) {
		console.error('[Map] popup chunk parse error:', result.error);
		throw new Error('[Map] Failed to parse popup chunk');
	}

	return result.data;
}

// Fetch and cache a popup chunk, keyed by URL so browsing warms chunks shared across maps
// Disabled when no chunk key is in play (inline objectives/MDX popups)
export function useChunkPopup(chunkKey: string | undefined) {
	const { chunkUrlBase, version, isDev } = useContext(ChunkConfigContext);

	const url =
		chunkKey && chunkUrlBase
			? `${chunkUrlBase}${chunkKey}.json?v=${version ?? 'unknown'}`
			: undefined;

	return useQuery<Array<MapPopupItem>>({
		queryKey: ['popup-chunk', url, isDev],
		queryFn: async () => {
			// Guarded by `enabled`, so a URL is always present when this runs
			if (!url) throw new Error('[Map] Popup chunk requested without a URL');

			const response = await fetch(
				url,
				isDev ? {} : { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
			);

			if (!response.ok) {
				throw new Error(`[Map] Popup chunk fetch failed: ${String(response.status)}`);
			}

			const raw: unknown = await response.json();

			return parseChunk(raw);
		},
		enabled: !!url,
		// A retired-chunk 404 after a deploy is deterministic; fail fast to the title-only fallback
		retry: 1,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});
}
