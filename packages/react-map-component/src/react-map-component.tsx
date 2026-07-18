import type { FC } from 'react';

import type { MapComponentProps } from './types';

import { MapCanvas } from './canvas/canvas';
import { DarkModeProvider } from './lib/dark-mode';
import { MapMessagesProvider } from './lib/messages';
import { ReactQueryProvider } from './lib/react-query';

export const ReactMapComponent: FC<MapComponentProps> = function ReactMapComponent(props) {
	return (
		<ReactQueryProvider isDev={props.isDev} version={props.version}>
			<DarkModeProvider darkMode={props.darkMode}>
				<MapMessagesProvider messages={props.messages}>
					<MapCanvas {...props} />
				</MapMessagesProvider>
			</DarkModeProvider>
		</ReactQueryProvider>
	);
};
