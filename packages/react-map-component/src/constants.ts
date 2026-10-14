import type { MapHostIntent } from '#host/host-intent.ts';

export const controlFilterId = 'map-filter-control';
export const controlSearchId = 'map-search-control';
export const fetchTimeoutMs = 10_000;
// Restored IndexedDB entries are not re-validated; bump when the persisted item shape changes
export const mapCacheSchemaVersion = '1';
export const mapCacheStorageKeyPrefix = 'scx-map-cache';
export const mapViewportStorageKeyPrefix = 'scx-map-viewport:';
// Dispatched on `document` as a `CustomEvent<MapTrackDetail>`; the host forwards it to its analytics
export const mapTrackEventName = 'map:track';

export const mapEnterEventName = 'map:enter';
export const mapExitEventName = 'map:exit';
export const mapExpandEventName = 'map:expand';
export const mapIntentEventName = 'map:intent';
export const mapSyncEventName = 'map:sync';
export const mapViewAttribute = 'data-map-view';
export const mapInsetProperty = '--map-inset-bottom';

declare global {
	interface DocumentEventMap {
		[mapEnterEventName]: Event;
		[mapExitEventName]: Event;
		[mapExpandEventName]: Event;
		[mapIntentEventName]: CustomEvent<MapHostIntent>;
		[mapSyncEventName]: Event;
	}
}
