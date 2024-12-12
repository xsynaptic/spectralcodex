import { useQuery } from '@tanstack/react-query';
import ky from 'ky';
import { useEffect } from 'react';

import type { MapComponentProps } from '../../types';
import type { MapPopupDataRaw } from '../../types';

import { useMapStoreActions } from '../../store/hooks/use-map-store';
import { MapPopupDataSchema } from '../../types/map-schemas';

// Dev server can timeout when regenerating huge amounts of content
const isDev = import.meta.env.DEV;

export function useMapApiPopupData({ apiEndpointUrl }: Pick<MapComponentProps, 'apiEndpointUrl'>) {
	const { setPopupData, setPopupDataLoading } = useMapStoreActions();

	const mapPopupDataQuery = useQuery({
		queryKey: ['popup-data', apiEndpointUrl],
		queryFn: async () => {
			if (apiEndpointUrl) {
				try {
					return await ky
						.get<MapPopupDataRaw>(`${apiEndpointUrl}/2`, { timeout: isDev ? false : 10_000 })
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
		function parsePopupData() {
			if (mapPopupDataQuery.data && mapPopupDataQuery.data.length > 0) {
				const parsedResponse = MapPopupDataSchema.safeParse(mapPopupDataQuery.data);

				if (!parsedResponse.success) {
					console.error(parsedResponse.error);
					return;
				}

				setPopupData(parsedResponse.data);
				setPopupDataLoading(false);
			}
		},
		[mapPopupDataQuery.data, setPopupData, setPopupDataLoading],
	);

	return mapPopupDataQuery;
}
