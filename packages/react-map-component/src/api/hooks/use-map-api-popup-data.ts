import { useQuery } from '@tanstack/react-query';
import ky from 'ky';
import { useEffect } from 'react';

import type { MapComponentProps } from '../../types';
import type { MapPopupDataRaw } from '../../types';

import { useMapStoreActions } from '../../store/hooks/use-map-store';
import { MapPopupDataSchema } from '../../types/map-schemas';

// Note: dev server can timeout when regenerating large amounts of content
export function useMapApiPopupData({
	apiPopupUrl,
	isDev,
}: Pick<MapComponentProps, 'apiPopupUrl' | 'isDev'>) {
	const { setPopupData, setPopupDataLoading } = useMapStoreActions();

	const mapPopupDataQuery = useQuery({
		queryKey: ['popup-data', apiPopupUrl],
		queryFn: async () => {
			if (apiPopupUrl) {
				try {
					return await ky
						.get<MapPopupDataRaw>(apiPopupUrl, { timeout: isDev ? false : 10_000 })
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
		enabled: !!apiPopupUrl,
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
