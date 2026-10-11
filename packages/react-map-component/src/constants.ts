import type { MapFeatureOpenDetail } from '#types.ts';

export const controlFilterId = 'map-filter-control';
export const controlSearchId = 'map-search-control';
export const mediaQueryMobile = '40rem';
export const fetchTimeoutMs = 10_000;
// Restored IndexedDB entries are not re-validated; bump when the persisted item shape changes
export const mapCacheSchemaVersion = '1';
export const mapCacheStorageKeyPrefix = 'scx-map-cache';
export const mapViewportStorageKeyPrefix = 'scx-map-viewport:';
// Dispatched on `document` as a `CustomEvent<MapTrackDetail>`; the host forwards it to its analytics
export const mapTrackEventName = 'map:track';

export const mapFeatureOpenEventName = 'map:feature-open';
export const mapSyncEventName = 'map:sync';
export const mapViewAttribute = 'data-map-view';

declare global {
	interface DocumentEventMap {
		[mapFeatureOpenEventName]: CustomEvent<MapFeatureOpenDetail>;
		[mapSyncEventName]: Event;
	}
}
