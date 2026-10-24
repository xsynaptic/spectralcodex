import { ContentCollectionsEnum } from '@spectralcodex/shared/collections';
import { describe, expect, test } from 'vitest';

import { resolveOgRegions } from '#og-image/content.ts';

function makeRegionRefs(ids: Array<string>) {
	return ids.map((id) => ({ collection: ContentCollectionsEnum.Regions, id }));
}

describe('resolveOgRegions', () => {
	test('resolves raw regions when there is no override', () => {
		expect(resolveOgRegions({ regions: makeRegionRefs(['taipei']) })).toEqual(['taipei']);
	});

	test('override regions win over raw regions', () => {
		expect(
			resolveOgRegions({
				override: { regions: makeRegionRefs(['taiwan']) },
				regions: makeRegionRefs(['taipei']),
			}),
		).toEqual(['taiwan']);
	});

	test('an override without regions falls back to raw regions', () => {
		expect(
			resolveOgRegions({
				override: { title: 'Sanitized Title' },
				regions: makeRegionRefs(['taipei']),
			}),
		).toEqual(['taipei']);
	});

	test('an empty override regions array falls back to raw regions', () => {
		expect(
			resolveOgRegions({
				override: { regions: [] },
				regions: makeRegionRefs(['taipei']),
			}),
		).toEqual(['taipei']);
	});

	test('returns an empty array when nothing is set', () => {
		expect(resolveOgRegions({})).toEqual([]);
	});
});
