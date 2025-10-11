import type { FC, ReactNode } from 'react';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import ky from 'ky';
import { createContext, useContext } from 'react';

import type { MapComponentProps, MapPopupItemInput, MapPopupItemParsed } from '../types';

import { MapPopupItemSchema } from '../types';

function parsePopupData(popupDataRaw: Array<MapPopupItemInput>) {
	const parsedResponse = MapPopupItemSchema.array().safeParse(popupDataRaw);

	if (!parsedResponse.success) {
		console.error('[Map] Popup data parse error:', parsedResponse.error);
		throw new Error('Failed to parse popup data');
	}

	return parsedResponse.data;
}

const PopupDataContext = createContext<
	UseQueryResult<Array<MapPopupItemParsed> | undefined> | undefined
>(undefined);

export const usePopupDataQuery = () => {
	const context = useContext(PopupDataContext);

	if (!context) {
		throw new Error('usePopupDataQuery must be used within a PopupDataContextProvider');
	}
	return context;
};

export const PopupDataContextProvider: FC<
	Pick<MapComponentProps, 'mapId' | 'apiPopupUrl' | 'popupData' | 'isDev'> & { children: ReactNode }
> = function PopupDataContextProvider({ mapId, apiPopupUrl, popupData, isDev, children }) {
	const popupDataQuery = useQuery<Array<MapPopupItemParsed> | undefined>({
		queryKey: ['popup-data', mapId, apiPopupUrl, isDev],
		queryFn: async () => {
			if (!apiPopupUrl) throw new Error('[Map] Popup data URL is required for fetching');

			const rawData = await ky
				.get<Array<MapPopupItemInput>>(apiPopupUrl, { timeout: isDev ? false : 10_000 })
				.json();

			return parsePopupData(rawData);
		},
		initialData: popupData ? parsePopupData(popupData) : undefined,
		enabled: !!apiPopupUrl,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

	return <PopupDataContext.Provider value={popupDataQuery}>{children}</PopupDataContext.Provider>;
};
