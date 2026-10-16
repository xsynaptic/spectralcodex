import type { MapHostControlName, MapTrackDetail } from '#types.ts';

export const fetchTimeoutMs = 10_000;
export const mapViewportStorageKeyPrefix = 'scx-map-viewport:';
export const mapTrackEventName = 'map:track';
export const mapControlEventName = 'map:control';
export const mapOpenEventName = 'map:open';
export const mapSyncEventName = 'map:sync';
export const mapViewAttribute = 'data-map-view';
export const mapActiveAttribute = 'data-active';
export const mapInsetProperty = '--map-inset-bottom';
export const mapPageHiddenProperty = '--map-page-hidden';
export const mapScopesFileName = 'map-scopes';

export function getHostControlClassName(name: MapHostControlName) {
	return `maplibregl-ctrl-${name}`;
}

export const mapControlClassName = {
	filter: 'maplibregl-ctrl-filter',
	filterRating: 'map-filter-rating',
	metrics: 'maplibregl-ctrl-metrics',
	popupTitle: 'map-popup-title',
	scopeBar: 'map-scope-bar',
	scopeName: 'map-scope-name',
	scopeToggle: 'map-scope-toggle',
} as const;

export const defaultMapMessages = {
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
	scopeAriaLabel: 'Showing only',
	scopeClearAriaLabel: 'Show all points',
	scopeOffAriaLabel: 'Showing all points, not only',
	scopeRestoreAriaLabel: 'Show only these points',
	searchCloseAriaLabel: 'Close search',
	searchEmpty: 'No match found',
	searchKindLocation: 'Location',
	searchKindRegion: 'Region',
	searchKindSeries: 'Series',
	searchKindTheme: 'Theme',
	searchLabel: 'Search map',
	searchListAriaLabel: 'Search results',
	searchResult: 'result',
	searchResults: 'results',
	showAll: 'Show All',
	wikipediaAriaLabel: 'Wikipedia',
} as const;

declare global {
	interface DocumentEventMap {
		[mapControlEventName]: CustomEvent<{ name: MapHostControlName }>;
		[mapOpenEventName]: CustomEvent<{ url: string }>;
		[mapSyncEventName]: Event;
		[mapTrackEventName]: CustomEvent<MapTrackDetail>;
	}
}
