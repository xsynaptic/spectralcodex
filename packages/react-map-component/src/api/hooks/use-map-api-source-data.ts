import { useQuery } from '@tanstack/react-query';
import ky from 'ky';
import { useEffect } from 'react';

import type { MapComponentProps } from '../../types';
import type { MapSourceItemInput } from '../../types';

import { useMapStoreActions } from '../../store/hooks/use-map-store';
import { MapSourceItemSchema } from '../../types/map-schemas';

export function useMapApiSourceData({
	apiSourceUrl,
	isDev,
}: Pick<MapComponentProps, 'apiSourceUrl' | 'isDev'>) {
	const { setSourceData, setSourceDataLoading } = useMapStoreActions();

	const mapSourceDataQuery = useQuery({
		queryKey: ['source-data', apiSourceUrl],
		queryFn: async () => {
			if (apiSourceUrl) {
				try {
					return await ky
						.get<Array<MapSourceItemInput>>(apiSourceUrl, { timeout: isDev ? false : 10_000 })
						.json();
				} catch (error) {
					console.error(error);
				}
			}
			return false;
		},
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		enabled: !!apiSourceUrl,
	});

	useEffect(
		function parseSourceData() {
			if (mapSourceDataQuery.data && mapSourceDataQuery.data.length > 0) {
				const parsedResponse = MapSourceItemSchema.array().safeParse(mapSourceDataQuery.data);

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
