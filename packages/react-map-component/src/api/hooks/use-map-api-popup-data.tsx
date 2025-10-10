import type { FC, ReactNode } from 'react';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import ky from 'ky';
import { createContext, useContext } from 'react';

import type { MapComponentProps, MapPopupItem, MapPopupItemInput } from '../../types';

import { parsePopupData } from '../map-api-utils';

function useMapApiPopupData({
	apiPopupUrl,
	popupData,
	isDev,
}: Pick<MapComponentProps, 'apiPopupUrl' | 'popupData' | 'isDev'>) {
	return useQuery({
		queryKey: ['popup-data', apiPopupUrl],
		queryFn: async () => {
			if (!apiPopupUrl) return [];

			try {
				const rawData = await ky
					.get<Array<MapPopupItemInput>>(apiPopupUrl, { timeout: isDev ? false : 10_000 })
					.json();

				return parsePopupData(rawData);
			} catch (error) {
				console.error('[Map] Popup data fetch error:', error);
				throw error;
			}
		},
		initialData: popupData ? parsePopupData(popupData) : undefined,
		enabled: !!apiPopupUrl || !!popupData,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});
}

const PopupDataContext = createContext<UseQueryResult<Array<MapPopupItem> | undefined> | undefined>(
	undefined,
);

export const usePopupDataQuery = () => {
	const context = useContext(PopupDataContext);

	if (!context) {
		throw new Error('usePopupDataQuery must be used within a PopupDataContextProvider');
	}
	return context;
};

export const PopupDataContextProvider: FC<
	Pick<MapComponentProps, 'apiPopupUrl' | 'popupData' | 'isDev'> & { children: ReactNode }
> = function PopupDataContextProvider({ apiPopupUrl, popupData, isDev, children }) {
	const popupDataQuery = useMapApiPopupData({ apiPopupUrl, popupData, isDev });

	return <PopupDataContext.Provider value={popupDataQuery}>{children}</PopupDataContext.Provider>;
};
