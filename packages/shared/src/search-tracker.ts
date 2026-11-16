const searchQueryMinLength = 2;
const searchQueryMaxLength = 100;

interface SearchEventData {
	empty: { query: string };
	query: { clicked: boolean; query: string; results: number };
}

type TrackSearchEvent = <Event extends keyof SearchEventData>(
	event: Event,
	data: SearchEventData[Event],
) => void;

interface PendingSearch {
	query: string;
	results: number;
}

export function reportSearch(
	{ clicked, query, results }: SearchEventData['query'],
	track: TrackSearchEvent,
) {
	const reportedQuery = query.replaceAll(/\s+/g, ' ').slice(0, searchQueryMaxLength);

	if (reportedQuery.length < searchQueryMinLength) return;

	track('query', { clicked, query: reportedQuery, results });

	if (results > 0) return;

	track('empty', { query: reportedQuery });
}

export function createSearchTracker(track: TrackSearchEvent) {
	let pending: PendingSearch | undefined;

	function update(searchTerm: string, results: number | undefined) {
		if (results === undefined) {
			pending = undefined;
			return;
		}

		pending = { query: searchTerm.trim(), results };
	}

	function end(isClicked: boolean) {
		if (!pending) return;

		const { query, results } = pending;

		pending = undefined;
		reportSearch({ clicked: isClicked, query, results }, track);
	}

	return { end, update };
}

export type SearchTracker = ReturnType<typeof createSearchTracker>;
