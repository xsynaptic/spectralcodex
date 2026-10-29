import { describe, expect, test } from 'vitest';

import {
	getRemoteDeletions,
	getSweepRefusals,
	parseRemoteListing,
	sweepWaitMs,
} from '#images/images-sweep.ts';

const now = new Date('2026-10-28T12:00:00Z');
const settled = { buildId: 'build-a', liveAt: new Date(now.getTime() - sweepWaitMs) };

function daysAgo(days: number) {
	return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

describe('getSweepRefusals', () => {
	test('passes a settled build sweeping at the limit', () => {
		expect(
			getSweepRefusals({
				counts: [{ deletions: 10, label: 'The cache', total: 100 }],
				live: settled,
				now,
			}),
		).toEqual([]);
	});

	test('refuses one file over the limit', () => {
		const refusals = getSweepRefusals({
			counts: [{ deletions: 11, label: 'The image host', total: 100 }],
			live: settled,
			now,
		});

		expect(refusals).toHaveLength(1);
		expect(refusals[0]).toContain('The image host');
	});

	test('refuses a build that went live inside the wait', () => {
		const refusals = getSweepRefusals({
			counts: [],
			live: { buildId: 'build-a', liveAt: new Date(now.getTime() - sweepWaitMs + 1000) },
			now,
		});

		expect(refusals).toHaveLength(1);
		expect(refusals[0]).toContain('build-a');
	});

	test('passes an empty listing', () => {
		expect(
			getSweepRefusals({
				counts: [{ deletions: 0, label: 'The image host', total: 0 }],
				live: settled,
				now,
			}),
		).toEqual([]);
	});
});

describe('parseRemoteListing', () => {
	test('skips rsync partials, whose finished copies may still be landing', () => {
		expect(
			parseRemoteListing(
				'a/b-1-450.jpg\t120\t1761652800.5\n.rsync-partial/a/b-1-600.jpg\t40\t1761652800\n',
			),
		).toEqual([{ modifiedAt: new Date(1_761_652_800_500), name: 'a/b-1-450.jpg', size: 120 }]);
	});
});

describe('getRemoteDeletions', () => {
	const remoteFiles = [
		{ modifiedAt: daysAgo(1), name: 'swept.jpg', size: 1 },
		{ modifiedAt: daysAgo(400), name: 'kept.jpg', size: 1 },
		{ modifiedAt: daysAgo(30), name: 'untracked-young.jpg', size: 1 },
		{ modifiedAt: daysAgo(400), name: 'untracked-old.jpg', size: 1 },
	];
	const localNames = new Set(['kept.jpg', 'swept.jpg']);

	function getNames(retentionDays: number) {
		return getRemoteDeletions({
			deletions: [{ name: 'swept.jpg', size: 1 }],
			localNames,
			now,
			remoteFiles,
			retentionDays,
		}).map((file) => file.name);
	}

	test('leaves a server-only file inside the window', () => {
		expect(getNames(365)).toEqual(['swept.jpg', 'untracked-old.jpg']);
	});

	test('a zero window mirrors the store', () => {
		expect(getNames(0)).toEqual(['swept.jpg', 'untracked-young.jpg', 'untracked-old.jpg']);
	});
});
