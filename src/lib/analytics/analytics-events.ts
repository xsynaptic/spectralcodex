import type { MapTrackDetail, MapTrackName } from '@spectralcodex/react-map-component';
import type { ShareKitActionDetail } from '@xsynaptic/share-kit';

import { createEventSender } from '@xsynaptic/analytics';
import { createUmamiAttributes, umamiTransport } from '@xsynaptic/analytics/umami';

export interface AnalyticsEvents extends Record<MapTrackName, MapTrackDetail['data']> {
	'build-version-reload': { staleHours: number };
	'image-download': { image: string };
	'image-metadata-open': { image: string };
	'map-search-empty': { mapId?: string; query: string };
	'map-search-query': { clicked: boolean; mapId?: string; query: string; results: number };
	'mode-toggle': undefined | { mode: string };
	'search-empty': { query: string };
	'search-open': undefined;
	'search-query': { clicked: boolean; query: string; results: number };
	'share-dialog': ShareKitActionDetail;
	'similar-show-more': undefined;
}

export const { sendEvent } = createEventSender<AnalyticsEvents>(umamiTransport);

export const { sendEventAttributes, setSendEventAttributes } =
	createUmamiAttributes<AnalyticsEvents>();
