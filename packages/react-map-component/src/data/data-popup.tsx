import { MapPopupItemSchema } from '@spectralcodex/map-codec';

import { createMapDataQuery } from '#data/data-query-factory.tsx';

export const { DataProvider: PopupDataContextProvider, useDataQuery: usePopupDataQuery } =
	createMapDataQuery({
		name: 'popup-data',
		optional: true,
		schema: MapPopupItemSchema,
	});
