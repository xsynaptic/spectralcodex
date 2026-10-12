import type { FC } from 'react';

import type { MapComponentProps } from '#types.ts';

import { MapCanvas } from '#canvas/canvas.tsx';
import { DarkModeProvider } from '#lib/dark-mode.tsx';
import { MapMessagesProvider } from '#lib/messages.tsx';
import { ReactQueryProvider } from '#lib/react-query.tsx';
import { MapTrackContext } from '#lib/track-context.tsx';

export const ReactMapComponent: FC<MapComponentProps> = function ReactMapComponent(props) {
	return (
		<ReactQueryProvider isDev={props.isDev}>
			<DarkModeProvider darkMode={props.darkMode}>
				<MapMessagesProvider messages={props.messages}>
					<MapTrackContext.Provider value={props.mapId}>
						<MapCanvas {...props} />
					</MapTrackContext.Provider>
				</MapMessagesProvider>
			</DarkModeProvider>
		</ReactQueryProvider>
	);
};
