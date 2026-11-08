import { describe, expect, test } from 'vitest';

import { getSyndicationTags } from '#lib/syndication/syndication-tags.ts';

function makeEntry(title: string) {
	return { data: { title } };
}

const regionAncestors: Record<string, Array<string>> = {
	changhua: ['Changhua', 'Taiwan'],
	lukang: ['Lukang', 'Changhua', 'Taiwan'],
	tainan: ['Tainan', 'Taiwan'],
};

function getRegionAncestorsById(regionId: string) {
	return (regionAncestors[regionId] ?? []).map((title) => makeEntry(title));
}

describe('getSyndicationTags', () => {
	test('a named Region brings its parent Regions after it', () => {
		expect(
			getSyndicationTags({ getRegionAncestorsById, regionIds: ['lukang'], themes: [] }),
		).toStrictEqual(['Lukang', 'Changhua', 'Taiwan']);
	});

	test('naming a Region and its child lists each Region once', () => {
		expect(
			getSyndicationTags({
				getRegionAncestorsById,
				regionIds: ['changhua', 'lukang'],
				themes: [],
			}),
		).toStrictEqual(['Changhua', 'Taiwan', 'Lukang']);
	});

	test('Themes come first in authored order, then Regions in authored order', () => {
		expect(
			getSyndicationTags({
				getRegionAncestorsById,
				regionIds: ['tainan', 'lukang'],
				themes: [makeEntry('Temples'), makeEntry('Japanese Colonial Era')],
			}),
		).toStrictEqual(['Temples', 'Japanese Colonial Era', 'Tainan', 'Taiwan', 'Lukang', 'Changhua']);
	});

	test('an Entry with no Themes or Regions has no tags', () => {
		expect(getSyndicationTags({ getRegionAncestorsById, regionIds: [], themes: [] })).toStrictEqual(
			[],
		);
	});
});
