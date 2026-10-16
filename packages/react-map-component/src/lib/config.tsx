import type { PropsWithChildren } from 'react';

import { createContext, useContext } from 'react';
import * as R from 'remeda';

import type { MapComponentProps, MapHost, MapMessages } from '#types.ts';

import { defaultMapMessages } from '#constants.ts';

export interface MapConfig extends Omit<
	MapComponentProps,
	'controls' | 'host' | 'messages' | 'targetIds'
> {
	host: MapHost;
	imageServerUrl: string;
	isInteractive: boolean;
	languages: Array<string>;
	messages: MapMessages;
}

const MapConfigContext = createContext<MapConfig | undefined>(undefined);

export function createMapConfig(props: MapComponentProps, host: MapHost): MapConfig {
	return {
		...R.omit(props, ['controls', 'host', 'messages', 'targetIds']),
		host,
		imageServerUrl: props.imageServerUrl ?? '',
		isInteractive: props.interactive !== false,
		languages: props.languages ?? ['en'],
		messages: { ...defaultMapMessages, ...props.messages },
	};
}

export function MapConfigProvider({ children, config }: PropsWithChildren<{ config: MapConfig }>) {
	return <MapConfigContext.Provider value={config}>{children}</MapConfigContext.Provider>;
}

export function useMapConfig() {
	const config = useContext(MapConfigContext);

	if (!config) throw new Error('[Map] Map config used outside its provider');

	return config;
}
