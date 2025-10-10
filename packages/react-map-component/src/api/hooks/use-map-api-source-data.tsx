import type { FC, ReactNode } from 'react';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import ky from 'ky';
import { createContext, useContext } from 'react';

import type { MapComponentProps, MapSourceItem, MapSourceItemInput } from '../../types';

import { parseSourceData } from '../map-api-utils';

function useMapApiSourceData({
	apiSourceUrl,
	sourceData,
	isDev,
}: Pick<MapComponentProps, 'apiSourceUrl' | 'sourceData' | 'isDev'>) {
	return useQuery({
		queryKey: ['source-data', apiSourceUrl],
		queryFn: async () => {
			if (!apiSourceUrl) return [];

			try {
				const rawData = await ky
					.get<Array<MapSourceItemInput>>(apiSourceUrl, { timeout: isDev ? false : 10_000 })
					.json();

				return parseSourceData(rawData);
			} catch (error) {
				console.error('[Map] Source data fetch error:', error);
				throw error;
			}
		},
		initialData: sourceData ? parseSourceData(sourceData) : undefined,
		enabled: !!apiSourceUrl || !!sourceData,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});
}

const SourceDataContext = createContext<
	UseQueryResult<Array<MapSourceItem> | undefined> | undefined
>(undefined);

export const useSourceDataQuery = () => {
	const context = useContext(SourceDataContext);

	if (!context) {
		throw new Error('useSourceDataQuery must be used within a SourceDataContextProvider');
	}
	return context;
};

export const SourceDataContextProvider: FC<
	Pick<MapComponentProps, 'apiSourceUrl' | 'sourceData' | 'isDev'> & { children: ReactNode }
> = function SourceDataContextProvider({ apiSourceUrl, sourceData, isDev, children }) {
	const sourceDataQuery = useMapApiSourceData({ apiSourceUrl, sourceData, isDev });

	return (
		<SourceDataContext.Provider value={sourceDataQuery}>{children}</SourceDataContext.Provider>
	);
};
