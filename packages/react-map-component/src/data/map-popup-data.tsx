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
	Pick<MapComponentProps, 'apiPopupUrl' | 'popupData' | 'version' | 'isDev'> & {
		children: ReactNode;
	}
> = function PopupDataContextProvider({ apiPopupUrl, popupData, version, isDev, children }) {
	const popupDataQuery = useQuery<Array<MapPopupItemParsed> | undefined>({
		queryKey: ['popup-data', apiPopupUrl, popupData, version, isDev],
		queryFn: async () => {
			// Use data passed directly to this component
			if (popupData) {
				return parsePopupData(popupData);
			}

			// Otherwise fetch via API
			if (apiPopupUrl) {
				const rawData = await ky
					.get<Array<MapPopupItemInput>>(apiPopupUrl, { timeout: isDev ? false : 10_000 })
					.json();

				return parsePopupData(rawData);
			}
			throw new Error('[Map] Either popupData or apiPopupUrl must be provided');
		},
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		enabled: !!apiPopupUrl || !!popupData,
	});

	return <PopupDataContext.Provider value={popupDataQuery}>{children}</PopupDataContext.Provider>;
};
