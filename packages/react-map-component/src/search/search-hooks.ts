import type { MapFeaturesRule } from '@spectralcodex/map-codec';
import type { QueryClient } from '@tanstack/react-query';

import { queryOptions, useQuery } from '@tanstack/react-query';
import { useCallback, useDeferredValue, useMemo } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import type { MapSearchResult } from '#search/search-factory.ts';
import type { MapOverlayClose } from '#types.ts';

import { mapRowsQueryOptions, scopeListQueryOptions } from '#data/data-query.ts';
import { useMapClick } from '#host/host-click.ts';
import { useMapConfig } from '#lib/config.tsx';
import { useTrackMap } from '#lib/track-hook.ts';
import { createSearchIndex, searchMap } from '#search/search-factory.ts';

async function queryScopeList(client: QueryClient, apiSourceUrl: string) {
	try {
		return await client.query(scopeListQueryOptions(apiSourceUrl));
	} catch {
		return;
	}
}

function searchIndexQueryOptions(apiSourceUrl: string, mapFeaturesRule: MapFeaturesRule) {
	return queryOptions({
		meta: { isDerived: true },
		queryFn: async ({ client }) => {
			const [rows, scopes] = await Promise.all([
				client.query({
					...mapRowsQueryOptions(apiSourceUrl, mapFeaturesRule),
					staleTime: 'static',
				}),
				queryScopeList(client, apiSourceUrl),
			]);

			return { index: createSearchIndex(rows, scopes ?? []), isComplete: scopes !== undefined };
		},
		queryKey: ['search-index', apiSourceUrl, mapFeaturesRule],
		staleTime: (query) => (query.state.data?.isComplete ? Infinity : 0),
	});
}

function useSearchPick(close: (how: MapOverlayClose) => void) {
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

export function useMapSearch(query: string, onClose: (how: MapOverlayClose) => void) {
	const { apiSourceUrl, mapFeaturesRule } = useMapConfig();
	const index = useQuery(searchIndexQueryOptions(apiSourceUrl, mapFeaturesRule)).data?.index;
	const deferredQuery = useDeferredValue(query);
	const results = useMemo(
		() => (index ? searchMap(index, deferredQuery) : undefined),
		[deferredQuery, index],
	);
	const pick = useSearchPick(onClose);

	function pickOnEnter(activeResult: MapSearchResult | undefined) {
		if (!index) return;

		const result = query === deferredQuery ? activeResult : searchMap(index, query)?.[0];

		if (result) pick(result, 'keyboard');
	}

	return { pick, pickOnEnter, results };
}
