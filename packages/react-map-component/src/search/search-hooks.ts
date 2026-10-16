import { useCallback, useMemo } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import type { MapSearchResult } from '#search/search-factory.ts';
import type { MapOverlayClose } from '#types.ts';

import { useMapRows, useMapScopeList } from '#data/data-query.ts';
import { useMapClick } from '#host/host-click.ts';
import { useTrackMap } from '#lib/track-hook.ts';
import { createSearchIndex } from '#search/search-factory.ts';
import { useMapStore } from '#store/store.tsx';

const noScopes = [] as const;

export function useMapSearchIndex() {
	const isSearchOpen = useMapStore((state) => state.overlay === 'search');
	const { data: rows } = useMapRows();
	const { data: scopes, isError } = useMapScopeList(isSearchOpen);

	const scopeRows = isError ? noScopes : scopes;

	return useMemo(
		() => (rows && scopeRows ? createSearchIndex(rows, scopeRows) : undefined),
		[rows, scopeRows],
	);
}

export function useSearchPick(close: (how: MapOverlayClose) => void) {
	const { current: map } = useMap();
	const click = useMapClick();
	const trackMap = useTrackMap();

	return useCallback(
		(result: MapSearchResult, how: MapOverlayClose) => {
			close(how);
			trackMap({ data: { kind: result.kind }, name: 'map-search-pick' });

			if (!map) return;

			click(
				result.kind === 'location'
					? { isPick: true, kind: 'point', pointId: result.pointId }
					: { kind: 'link', url: result.url },
				map.getMap(),
			);
		},
		[click, close, map, trackMap],
	);
}
