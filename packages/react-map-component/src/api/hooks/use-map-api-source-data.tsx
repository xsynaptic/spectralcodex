import type { FC, ReactNode } from 'react';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import ky from 'ky';
import { createContext, useContext } from 'react';

import type { MapComponentProps, MapSourceItem, MapSourceItemInput } from '../../types';

import { parseSourceData } from '../map-api-utils';

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
	Pick<MapComponentProps, 'mapId' | 'apiSourceUrl' | 'sourceData' | 'isDev'> & {
		children: ReactNode;
	}
> = function SourceDataContextProvider({ mapId, apiSourceUrl, sourceData, isDev, children }) {
	const sourceDataQuery = useQuery({
		queryKey: ['source-data', mapId, apiSourceUrl, isDev],
		queryFn: async () => {
			if (!apiSourceUrl) {
				throw new Error('[Map] Source data URL is required for fetching');
			}

			const rawData = await ky
				.get<Array<MapSourceItemInput>>(apiSourceUrl, { timeout: isDev ? false : 10_000 })
				.json();

			return parseSourceData(rawData);
		},
		initialData: sourceData ? parseSourceData(sourceData) : undefined,
		enabled: !!apiSourceUrl,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

	return (
		<SourceDataContext.Provider value={sourceDataQuery}>{children}</SourceDataContext.Provider>
	);
};
