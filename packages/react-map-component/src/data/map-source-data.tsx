import type { FC, ReactNode } from 'react';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import ky from 'ky';
import { createContext, useContext } from 'react';

import type { MapComponentProps, MapSourceItemInput, MapSourceItemParsed } from '../types';

import { MapSourceItemSchema } from '../types';

export function parseSourceData(sourceDataRaw: Array<MapSourceItemInput>) {
	const parsedResponse = MapSourceItemSchema.array().safeParse(sourceDataRaw);

	if (!parsedResponse.success) {
		console.error('[Map] Source data parse error:', parsedResponse.error);
		throw new Error('Failed to parse source data');
	}
	return parsedResponse.data;
}

const SourceDataContext = createContext<
	UseQueryResult<Array<MapSourceItemParsed> | undefined> | undefined
>(undefined);

export const useSourceDataQuery = () => {
	const context = useContext(SourceDataContext);

	if (!context) {
		throw new Error('useSourceDataQuery must be used within a SourceDataContextProvider');
	}
	return context;
};

export const SourceDataContextProvider: FC<
	Pick<MapComponentProps, 'apiSourceUrl' | 'sourceData' | 'isDev'> & {
		children: ReactNode;
	}
> = function SourceDataContextProvider({ apiSourceUrl, sourceData, isDev, children }) {
	const sourceDataQuery = useQuery<Array<MapSourceItemParsed> | undefined>({
		queryKey: ['source-data', apiSourceUrl, sourceData, isDev],
		queryFn: async () => {
			// Use data passed directly to this component
			if (sourceData) {
				return parseSourceData(sourceData);
			}

			// Otherwise fetch via API
			if (apiSourceUrl) {
				const rawData = await ky
					.get<Array<MapSourceItemInput>>(apiSourceUrl, { timeout: isDev ? false : 10_000 })
					.json();

				return parseSourceData(rawData);
			}
			throw new Error('[Map] Either sourceData or apiSourceUrl must be provided');
		},
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

	return (
		<SourceDataContext.Provider value={sourceDataQuery}>{children}</SourceDataContext.Provider>
	);
};
