import { MapSourceItemSchema } from '@spectralcodex/map-codec';
import { useMemo } from 'react';

import { createMapDataQuery } from '#data/data-query-factory.tsx';

export const { DataProvider: SourceDataContextProvider, useDataQuery: useSourceDataQuery } =
	createMapDataQuery({
		name: 'source-data',
		schema: MapSourceItemSchema,
	});

export function useSourceDataItem(id: string | undefined) {
	const { data: sourceData } = useSourceDataQuery();

	return useMemo(
		() => (id ? sourceData?.find((item) => item.properties.id === id) : undefined),
		[id, sourceData],
	);
}
