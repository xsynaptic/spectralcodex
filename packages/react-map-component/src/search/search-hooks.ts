import type { MapFeaturesRule, MapPayloadBase } from '@spectralcodex/map-codec';
import type { QueryClient } from '@tanstack/react-query';

import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import type { MapOverlayClose } from '#lib/types.ts';
import type { MapSearchResult } from '#search/search-factory.ts';
import type { SearchSession } from '#search/search-session.ts';

import { mapRowsQueryOptions, scopeListQueryOptions } from '#data/data-query.ts';
import { useMapClick } from '#host/host-click.ts';
import { useMapConfig } from '#lib/config.tsx';
import { mapSearchEndEventName } from '#lib/constants.ts';
import { useTrackMap } from '#lib/track-hook.ts';
import { createSearchIndex, searchMap } from '#search/search-factory.ts';
import { createSearchSession } from '#search/search-session.ts';

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

function useSearchSession() {
	const { mapId } = useMapConfig();
	const [searchSession] = useState(() =>
		createSearchSession((outcome) => {
			document.dispatchEvent(
				new CustomEvent(mapSearchEndEventName, { detail: { ...outcome, mapId } }),
			);
		}),
	);

	useEffect(
		() => () => {
			searchSession.end(false);
		},
		[searchSession],
	);

	return searchSession;
}

function useSearchPick(close: (how: MapOverlayClose) => void, searchSession: SearchSession) {
	const { current: map } = useMap();
	const click = useMapClick();
	const trackMap = useTrackMap();

	return useCallback(
		(result: MapSearchResult, how: MapOverlayClose) => {
			searchSession.end(true);
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
		[click, close, map, searchSession, trackMap],
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
	const searchSession = useSearchSession();
	const pick = useSearchPick(onClose, searchSession);

	useEffect(() => {
		searchSession.update(deferredQuery, results?.length);
	}, [deferredQuery, results, searchSession]);

	function pickOnEnter(activeResult: MapSearchResult | undefined) {
		if (!index) return;

		if (query === deferredQuery) {
			if (activeResult) pick(activeResult, 'keyboard');
			return;
		}

		const currentResults = searchMap(index, query);

		searchSession.update(query, currentResults?.length);

		if (currentResults?.[0]) pick(currentResults[0], 'keyboard');
	}

	return { pick, pickOnEnter, results };
}
