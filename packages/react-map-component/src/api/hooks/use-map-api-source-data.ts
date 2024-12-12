import { useQuery } from '@tanstack/react-query';
import ky from 'ky';
import { useEffect } from 'react';

import type { MapComponentProps } from '../../types';
import type { MapSourceDataRaw } from '../../types';

import { useMapStoreActions } from '../../store/hooks/use-map-store';
import { MapSourceDataSchema } from '../../types/map-schemas';

// Dev server can timeout when regenerating huge amounts of content
const isDev = import.meta.env.DEV;

export function useMapApiSourceData({ apiEndpointUrl }: Pick<MapComponentProps, 'apiEndpointUrl'>) {
	const { setSourceData, setSourceDataLoading } = useMapStoreActions();

	const mapSourceDataQuery = useQuery({
		queryKey: ['canvas-data', apiEndpointUrl],
		queryFn: async () => {
			if (apiEndpointUrl) {
				try {
					return await ky
						.get<MapSourceDataRaw>(`${apiEndpointUrl}/1`, { timeout: isDev ? false : 10_000 })
						.json();
				} catch (error) {
					console.error(error);
				}
			}
			return false;
		},
		// Server data does not change on a static site!
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		staleTime: 100_000,
		enabled: !!apiEndpointUrl,
	});

	useEffect(
		function parseSourceData() {
			if (mapSourceDataQuery.data && mapSourceDataQuery.data.length > 0) {
				const parsedResponse = MapSourceDataSchema.safeParse(mapSourceDataQuery.data);

				if (!parsedResponse.success) {
					console.error(parsedResponse.error);
					return;
				}

				setSourceData(parsedResponse.data);
				setSourceDataLoading(false);
			}
		},
		[mapSourceDataQuery.data, setSourceData, setSourceDataLoading],
	);

	return mapSourceDataQuery;
}
