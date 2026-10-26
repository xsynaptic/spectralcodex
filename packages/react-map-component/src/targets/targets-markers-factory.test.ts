import { describe, expect, test } from 'vitest';

import { makeMapSourceItem } from '#lib/map-test-utils.ts';
import { getTargetPoints } from '#targets/targets-markers-factory.ts';

describe('getTargetPoints', () => {
	const items = [
		makeMapSourceItem({ id: 'theater' }, [121.8, 24.6]),
		makeMapSourceItem({ id: 'railway' }, [121, 24]),
		makeMapSourceItem({ id: 'temple' }, [120.2, 23]),
	];

	test('yields the Targets only, in Target order', () => {
		expect(getTargetPoints(items, ['railway', 'theater'])).toEqual([
			{ coordinates: [121, 24], id: 'railway' },
			{ coordinates: [121.8, 24.6], id: 'theater' },
		]);
	});

	test('an unknown Target yields nothing', () => {
		expect(getTargetPoints(items, ['missing'])).toEqual([]);
	});
});
