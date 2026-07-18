import type { PropsWithChildren } from 'react';

import { createContext, useContext, useMemo } from 'react';

// Host-overridable UI strings; plain strings so they survive Astro island-prop serialization
export interface MapMessages {
	showAll: string;
	hideAll: string;
	points: string;
	precisionWarning: string;
	precisionError: string;
	filterMenuAriaLabel: string;
	searchAriaLabel: string;
	searchPlaceholder: string;
}

const defaultMapMessages: MapMessages = {
	showAll: 'Show All',
	hideAll: 'Hide All',
	points: 'Points',
	precisionWarning: 'Coordinates for this point are imprecise!',
	precisionError: 'Coordinates for this point are only a guess!',
	filterMenuAriaLabel: 'Filter Menu',
	searchAriaLabel: 'Search',
	searchPlaceholder: 'Search text or coordinates...',
};

const MapMessagesContext = createContext<MapMessages>(defaultMapMessages);

export function MapMessagesProvider({
	messages,
	children,
}: PropsWithChildren<{ messages?: Partial<MapMessages> | undefined }>) {
	const value = useMemo<MapMessages>(() => ({ ...defaultMapMessages, ...messages }), [messages]);

	return <MapMessagesContext.Provider value={value}>{children}</MapMessagesContext.Provider>;
}

export function useMapMessages() {
	return useContext(MapMessagesContext);
}
