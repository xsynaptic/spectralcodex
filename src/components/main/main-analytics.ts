import {
	mapSearchEndEventName,
	mapTrackEventName,
} from '@spectralcodex/react-map-component/constants';
import { recordTraversalPageviews } from '@xsynaptic/analytics/umami';
import {
	normalizeSearchQuery,
	searchToggleSearchEndEventName,
} from '@xsynaptic/astro-pagefind/search-toggle';

import { sendEvent } from '#lib/analytics/analytics-events.ts';

document.addEventListener(mapTrackEventName, ({ detail: { data, mapId, name } }) => {
	sendEvent(name, mapId === undefined ? data : { ...data, mapId });
});

document.addEventListener(
	searchToggleSearchEndEventName,
	({ detail: { clicked, query, results } }) => {
		const reportedQuery = normalizeSearchQuery(query);

		if (reportedQuery === undefined) return;

		sendEvent('search-query', { clicked, query: reportedQuery, results });

		if (results > 0) return;

		sendEvent('search-empty', { query: reportedQuery });
	},
);

document.addEventListener(
	mapSearchEndEventName,
	({ detail: { clicked, mapId, query, results } }) => {
		const reportedQuery = normalizeSearchQuery(query);

		if (reportedQuery === undefined) return;

		const scope = mapId === undefined ? {} : { mapId };

		sendEvent('map-search-query', { clicked, query: reportedQuery, results, ...scope });

		if (results > 0) return;

		sendEvent('map-search-empty', { query: reportedQuery, ...scope });
	},
);

recordTraversalPageviews();
