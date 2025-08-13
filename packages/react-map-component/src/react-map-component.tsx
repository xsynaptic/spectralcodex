import type { CSSProperties, FC } from 'react';

import { memo } from 'react';

import type { MapComponentProps } from './types';

import { parsePopupData, parseSourceData } from './api/map-api-utils';
import { MapCanvas } from './canvas/map-canvas';
import { DarkModeProvider } from './lib/dark-mode';
import { ReactQueryProvider } from './lib/react-query/react-query-provider';
import { MapStoreProvider } from './store/map-store-provider';

import 'maplibre-gl/dist/maplibre-gl.css';

export const ReactMapComponent: FC<MapComponentProps & { style: CSSProperties }> = memo(
	function ReactMapComponent({
		sourceData,
		popupData,
		cluster,
		showObjectiveFilter,
		languages,
		...props
	}) {
		const sourceDataParsed = sourceData ? parseSourceData(sourceData) : undefined;
		const popupDataParsed = popupData ? parsePopupData(popupData) : undefined;

		return (
			<ReactQueryProvider>
				<DarkModeProvider>
					<MapStoreProvider
						initialState={{
							...(sourceDataParsed
								? { sourceData: sourceDataParsed, sourceDataLoading: false }
								: {}),
							...(popupDataParsed ? { popupData: popupDataParsed, popupDataLoading: false } : {}),
							...(cluster ? { canvasClusters: cluster } : {}),
							...(showObjectiveFilter ? { showObjectiveFilter: true } : {}),
							...(props.interactive === false ? { canvasInteractive: false } : {}),
							...(languages ? { languages } : {}),
						}}
					>
						<MapCanvas {...props} />
					</MapStoreProvider>
				</DarkModeProvider>
			</ReactQueryProvider>
		);
	},
);
