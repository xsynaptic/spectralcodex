import type { FC } from 'react';

import type { MapComponentProps } from './types';

import { MapCanvas } from './canvas/map-canvas';
import { DarkModeProvider } from './lib/dark-mode';

import 'maplibre-gl/dist/maplibre-gl.css';

import { ReactQueryProvider } from './lib/react-query';

export const ReactMapComponent: FC<MapComponentProps> = function ReactMapComponent(props) {
	return (
		<ReactQueryProvider>
			<DarkModeProvider>
				<MapCanvas {...props} />
			</DarkModeProvider>
		</ReactQueryProvider>
	);
};
