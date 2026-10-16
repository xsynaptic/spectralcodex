import type { FC } from 'react';

import { useState } from 'react';

import type { MapComponentProps } from '#types.ts';

import { MapCanvas } from '#canvas/canvas.tsx';
import { createMapHost } from '#host/host-adapter.ts';
import { createMapConfig, MapConfigProvider } from '#lib/config.tsx';
import { ReactQueryProvider } from '#lib/react-query.tsx';

export const ReactMapComponent: FC<MapComponentProps> = function ReactMapComponent(props) {
	const [config] = useState(() => createMapConfig(props, createMapHost(props)));

	return (
		<ReactQueryProvider>
			<MapConfigProvider config={config}>
				<MapCanvas />
			</MapConfigProvider>
		</ReactQueryProvider>
	);
};
