import type { PropsWithChildren } from 'react';

import { createContext, useContext, useMemo } from 'react';

// Host-overridable UI strings; plain strings so they survive Astro island-prop serialization
export interface MapMessages {
	copyCoordinatesLabel: string;
	filterMenuAriaLabel: string;
	googleMapsAriaLabel: string;
	hideAll: string;
	point: string;
	points: string;
	popupDescriptionAriaLabel: string;
	precisionError: string;
	precisionWarning: string;
	ratingFilterAriaLabel: string;
	searchAriaLabel: string;
	searchPlaceholder: string;
	showAll: string;
	wikipediaAriaLabel: string;
}

const defaultMapMessages: MapMessages = {
	showAll: 'Show All',
	hideAll: 'Hide All',
	point: 'Point',
	points: 'Points',
	precisionWarning: 'Coordinates for this point are imprecise!',
	precisionError: 'Coordinates for this point are only a guess!',
	filterMenuAriaLabel: 'Filter Menu',
	ratingFilterAriaLabel: 'Minimum rating',
	copyCoordinatesLabel: 'Copy coordinates',
	wikipediaAriaLabel: 'Wikipedia',
	googleMapsAriaLabel: 'Google Maps',
	popupDescriptionAriaLabel: 'Description',
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
