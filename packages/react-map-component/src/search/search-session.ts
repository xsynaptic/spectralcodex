import type { MapSearchEndDetail } from '#lib/types.ts';

type MapSearchOutcome = Omit<MapSearchEndDetail, 'mapId'>;

export function createSearchSession(report: (outcome: MapSearchOutcome) => void) {
	let pending: Omit<MapSearchOutcome, 'clicked'> | undefined;

	function update(searchTerm: string, results: number | undefined) {
		const query = searchTerm.trim();

		if (query === '' || results === undefined) {
			pending = undefined;
			return;
		}

		pending = { query, results };
	}

	function end(isClicked: boolean) {
		if (!pending) return;

		const outcome = { clicked: isClicked, ...pending };

		pending = undefined;
		report(outcome);
	}

	return { end, update };
}

export type SearchSession = ReturnType<typeof createSearchSession>;
