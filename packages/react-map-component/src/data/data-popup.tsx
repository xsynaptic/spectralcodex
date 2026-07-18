import { MapPopupItemSchema } from '@spectralcodex/map-codec';

import { createMapDataQuery } from './data-query-factory';

export const { DataProvider: PopupDataContextProvider, useDataQuery: usePopupDataQuery } =
	createMapDataQuery({
		name: 'popup-data',
		schema: MapPopupItemSchema,
		optional: true,
	});
