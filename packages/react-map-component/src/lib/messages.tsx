import type { PropsWithChildren } from 'react';

import { createContext, useContext, useMemo } from 'react';

// Host-overridable UI strings; plain strings so they survive Astro island-prop serialization
export interface MapMessages {
	copyCoordinatesLabel: string;
	enterAriaLabel: string;
	exitAriaLabel: string;
	expandAriaLabel: string;
	filterMenuActiveAriaLabel: string;
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
	copyCoordinatesLabel: 'Copy coordinates',
	enterAriaLabel: 'Open map',
	exitAriaLabel: 'Close map',
	expandAriaLabel: 'Expand map',
	filterMenuActiveAriaLabel: 'Filter Menu, filters active',
	filterMenuAriaLabel: 'Filter Menu',
	googleMapsAriaLabel: 'Google Maps',
	hideAll: 'Hide All',
	point: 'Point',
	points: 'Points',
	popupDescriptionAriaLabel: 'Description',
	precisionError: 'Coordinates for this point are only a guess!',
	precisionWarning: 'Coordinates for this point are imprecise!',
	ratingFilterAriaLabel: 'Minimum rating',
	searchAriaLabel: 'Search',
	searchPlaceholder: 'Search text or coordinates...',
	showAll: 'Show All',
	wikipediaAriaLabel: 'Wikipedia',
};

const MapMessagesContext = createContext<MapMessages>(defaultMapMessages);

export function MapMessagesProvider({
	children,
	messages,
}: PropsWithChildren<{ messages?: Partial<MapMessages> | undefined }>) {
	const value = useMemo<MapMessages>(() => ({ ...defaultMapMessages, ...messages }), [messages]);

	return <MapMessagesContext.Provider value={value}>{children}</MapMessagesContext.Provider>;
}

export function useMapMessages() {
	return useContext(MapMessagesContext);
}
