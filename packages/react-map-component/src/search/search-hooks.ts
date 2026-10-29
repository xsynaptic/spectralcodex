import type { MapFeaturesRule, MapPayloadBase } from '@spectralcodex/map-codec';
import type { SearchTracker } from '@spectralcodex/shared/search-tracker';
import type { QueryClient } from '@tanstack/react-query';

import { createSearchTracker } from '@spectralcodex/shared/search-tracker';
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import type { MapSearchResult } from '#search/search-factory.ts';
import type { MapOverlayClose } from '#types.ts';

import { mapRowsQueryOptions, scopeListQueryOptions } from '#data/data-query.ts';
import { useMapClick } from '#host/host-click.ts';
import { useMapConfig } from '#lib/config.tsx';
import { useTrackMap } from '#lib/track-hook.ts';
import { createSearchIndex, searchMap } from '#search/search-factory.ts';

async function queryScopeList(client: QueryClient, payloadBase: MapPayloadBase) {
	try {
		return await client.query(scopeListQueryOptions(payloadBase));
	} catch {
		return;
	}
}

function searchIndexQueryOptions(payloadBase: MapPayloadBase, mapFeaturesRule: MapFeaturesRule) {
	return queryOptions({
		meta: { isDerived: true },
		queryFn: async ({ client }) => {
			const [rows, scopes] = await Promise.all([
				client.query(mapRowsQueryOptions(payloadBase, mapFeaturesRule)),
				queryScopeList(client, payloadBase),
			]);

			return { index: createSearchIndex(rows, scopes ?? []), isComplete: scopes !== undefined };
		},
		queryKey: ['search-index', payloadBase, mapFeaturesRule],
		staleTime: (query) => (query.state.data?.isComplete ? Infinity : 0),
	});
}

export function usePrefetchMapSearch() {
	const client = useQueryClient();
	const { mapFeaturesRule, payloadBase } = useMapConfig();

	async function prefetch() {
		try {
			await client.query(searchIndexQueryOptions(payloadBase, mapFeaturesRule));
		} catch {
			return;
		}
	}

	return () => {
		void prefetch();
	};
}

function useSearchTracker() {
	const trackMap = useTrackMap();
	const [searchTracker] = useState(() =>
		createSearchTracker((event, data) => {
			trackMap({ data, name: `map-search-${event}` });
		}),
	);

	useEffect(
		() => () => {
			searchTracker.end(false);
		},
		[searchTracker],
	);

	return searchTracker;
}

function useSearchPick(close: (how: MapOverlayClose) => void, searchTracker: SearchTracker) {
	const { current: map } = useMap();
	const click = useMapClick();
	const trackMap = useTrackMap();

	return useCallback(
		(result: MapSearchResult, how: MapOverlayClose) => {
			searchTracker.end(true);
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
		[click, close, map, searchTracker, trackMap],
	);
}

export function useMapSearch(query: string, onClose: (how: MapOverlayClose) => void) {
	const { mapFeaturesRule, payloadBase } = useMapConfig();
	const index = useQuery(searchIndexQueryOptions(payloadBase, mapFeaturesRule)).data?.index;
	const deferredQuery = useDeferredValue(query);
	const results = useMemo(
		() => (index ? searchMap(index, deferredQuery) : undefined),
		[deferredQuery, index],
	);
	const searchTracker = useSearchTracker();
	const pick = useSearchPick(onClose, searchTracker);

	useEffect(() => {
		searchTracker.update(deferredQuery, results?.length);
	}, [deferredQuery, results, searchTracker]);

	function pickOnEnter(activeResult: MapSearchResult | undefined) {
		if (!index) return;

		if (query === deferredQuery) {
			if (activeResult) pick(activeResult, 'keyboard');
			return;
		}

		const currentResults = searchMap(index, query);

		searchTracker.update(query, currentResults?.length);

		if (currentResults?.[0]) pick(currentResults[0], 'keyboard');
	}

	return { pick, pickOnEnter, results };
}
