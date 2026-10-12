import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

import { useQuery } from '@tanstack/react-query';

import type { MapComponentProps } from '#types.ts';

import { fetchTimeoutMs } from '#constants.ts';

export function useMapApiDivisionData({
	apiDivisionUrl,
	isDev,
}: Pick<MapComponentProps, 'apiDivisionUrl' | 'isDev'>) {
	// Errors must propagate so React Query retries instead of caching a permanent empty result
	return useQuery<FeatureCollection<MultiPolygon | Polygon>>({
		enabled: !!apiDivisionUrl,
		queryFn: async () => {
			if (!apiDivisionUrl) throw new Error('[Map] Division data query enabled without a URL');

			const [response, { deserializeDivisionMasks }] = await Promise.all([
				fetch(apiDivisionUrl, isDev ? {} : { signal: AbortSignal.timeout(fetchTimeoutMs) }),
				import('#data/data-division-factory.ts'),
			]);

			if (!response.ok) throw new Error(`[Map] Fetch failed: ${String(response.status)}`);

			return deserializeDivisionMasks(await response.arrayBuffer());
		},
		queryKey: ['division-data', apiDivisionUrl, isDev],
		refetchOnMount: false,
		refetchOnWindowFocus: false,
	});
}
