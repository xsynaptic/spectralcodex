import { useQuery } from '@tanstack/react-query';
import ky from 'ky';
import { useEffect } from 'react';

import type { MapComponentProps } from '../../types';
import type { MapPopupItemInput } from '../../types';

import { useMapStoreActions } from '../../store/hooks/use-map-store';
import { MapPopupItemSchema } from '../../types/map-schemas';

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
						.get<Array<MapPopupItemInput>>(apiPopupUrl, { timeout: isDev ? false : 10_000 })
						.json();
				} catch (error) {
					console.error(error);
				}
			}
			return false;
		},
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		enabled: !!apiPopupUrl,
	});

	useEffect(
		function parsePopupData() {
			if (mapPopupDataQuery.data && mapPopupDataQuery.data.length > 0) {
				const parsedResponse = MapPopupItemSchema.array().safeParse(mapPopupDataQuery.data);

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
