import { MapSourceItemSchema } from '@spectralcodex/map-codec';

import { createMapDataQuery } from './data-query-factory';

export const { DataProvider: SourceDataContextProvider, useDataQuery: useSourceDataQuery } =
	createMapDataQuery({
		name: 'source-data',
		schema: MapSourceItemSchema,
	});
