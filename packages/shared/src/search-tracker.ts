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

export function createSearchTracker(track: TrackSearchEvent) {
	let pending: PendingSearch | undefined;

	function update(searchTerm: string, results: number | undefined) {
		const query = searchTerm.replaceAll(/\s+/g, ' ').trim().slice(0, searchQueryMaxLength);

		if (results === undefined || query.length < searchQueryMinLength) {
			pending = undefined;
			return;
		}

		pending = { query, results };
	}

	function end(isClicked: boolean) {
		if (!pending) return;

		const { query, results } = pending;

		pending = undefined;
		track('query', { clicked: isClicked, query, results });

		if (results > 0) return;

		track('empty', { query });
	}

	return { end, update };
}

export type SearchTracker = ReturnType<typeof createSearchTracker>;
