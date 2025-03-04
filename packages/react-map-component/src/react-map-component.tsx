import type { CSSProperties } from 'react';

import { memo } from 'react';

import type { MapComponentProps } from './types';

import { parsePopupData, parseSourceData } from './api/map-api-utils';
import { MapCanvas } from './canvas/map-canvas';
import { ReactQueryProvider } from './lib/react-query/react-query-provider';
import { MapStoreProvider } from './store/map-store-provider';

import 'maplibre-gl/dist/maplibre-gl.css';

export const ReactMapComponent = memo(function ReactMapComponent({
	sourceData,
	popupData,
	cluster,
	showObjectiveFilter,
	languages,
	buildId,
	...props
}: MapComponentProps & { style: CSSProperties }) {
	const sourceDataParsed = sourceData ? parseSourceData(sourceData) : undefined;
	const popupDataParsed = popupData ? parsePopupData(popupData) : undefined;

	return (
		<ReactQueryProvider>
			<MapStoreProvider
				initialState={{
					...(sourceDataParsed ? { sourceData: sourceDataParsed, sourceDataLoading: false } : {}),
					...(popupDataParsed ? { popupData: popupDataParsed, popupDataLoading: false } : {}),
					...(cluster ? { canvasClusters: cluster } : {}),
					...(showObjectiveFilter ? { showObjectiveFilter: true } : {}),
					...(props.interactive === false ? { canvasInteractive: false } : {}),
					...(languages ? { languages } : {}),
				}}
				buildId={buildId}
			>
				<MapCanvas {...props} />
			</MapStoreProvider>
		</ReactQueryProvider>
	);
});
