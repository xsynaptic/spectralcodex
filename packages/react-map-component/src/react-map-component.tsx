import type { CSSProperties, FC } from 'react';

import { memo } from 'react';

import type { MapComponentProps } from './types';

import { MapCanvas } from './canvas/map-canvas';
import { DarkModeProvider } from './lib/dark-mode';
import { ReactQueryProvider } from './lib/react-query/react-query-provider';

import 'maplibre-gl/dist/maplibre-gl.css';

export const ReactMapComponent: FC<MapComponentProps & { style: CSSProperties }> = memo(
	function ReactMapComponent(props) {
		return (
			<ReactQueryProvider>
				<DarkModeProvider>
					<MapCanvas {...props} />
				</DarkModeProvider>
			</ReactQueryProvider>
		);
	},
);
