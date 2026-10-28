import { describe, expect, test } from 'vitest';

import { getSweepRefusals, parseRemoteListing, sweepWaitMs } from '#images/images-sweep.ts';

const now = new Date('2026-10-28T12:00:00Z');
const settled = { buildId: 'build-a', liveAt: new Date(now.getTime() - sweepWaitMs) };

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
		expect(parseRemoteListing('a/b-1-450.jpg\t120\n.rsync-partial/a/b-1-600.jpg\t40\n')).toEqual([
			{ name: 'a/b-1-450.jpg', size: 120 },
		]);
	});
});
