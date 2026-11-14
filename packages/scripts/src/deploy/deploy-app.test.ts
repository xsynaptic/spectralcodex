import { fc, test } from '@fast-check/vitest';
import { readFileSync } from 'node:fs';
import { describe, expect } from 'vitest';

import { planAssetRetention, retentionDays } from '#deploy/deploy-app.ts';
import { documentCacheControl } from '#deploy/verify-edge-probes.ts';
import { sweepWaitMs } from '#images/images-sweep.ts';

const now = new Date('2026-12-01T00:00:00Z');
const nowSeconds = now.getTime() / 1000;
const daySeconds = 24 * 60 * 60;

describe('planAssetRetention', () => {
	test('keeps a chunk replaced on this deploy however long it was live', () => {
		const plan = planAssetRetention({
			currentNames: new Set(['entry.new.js']),
			ledger: '',
			now,
			remoteNames: ['entry.new.js', 'entry.old.js'],
		});

		expect(plan.deletions).toEqual([]);
		expect(plan.ledger).toBe(`entry.old.js\t${String(nowSeconds)}`);
	});

	test('deletes a chunk only once it has been out of the build for over seven days', () => {
		const plan = planAssetRetention({
			currentNames: new Set(),
			ledger: [
				`expired.js\t${String(nowSeconds - 8 * daySeconds)}`,
				`recent.js\t${String(nowSeconds - 6 * daySeconds)}`,
			].join('\n'),
			now,
			remoteNames: ['expired.js', 'recent.js'],
		});

		expect(plan.deletions).toEqual(['expired.js']);
		expect(plan.ledger).toBe(`recent.js\t${String(nowSeconds - 6 * daySeconds)}`);
	});

	test('forgets chunks that returned to the build or left the server', () => {
		const plan = planAssetRetention({
			currentNames: new Set(['fonts/returned.woff2']),
			ledger: [
				`fonts/returned.woff2\t${String(nowSeconds - 3 * daySeconds)}`,
				`gone.js\t${String(nowSeconds - 3 * daySeconds)}`,
			].join('\n'),
			now,
			remoteNames: ['fonts/returned.woff2'],
		});

		expect(plan.deletions).toEqual([]);
		expect(plan.ledger).toBe('');
	});

	test('restarts the clock on a line it cannot trust', () => {
		const names = ['empty.js', 'truncated.js', 'text.js', 'future.js'];
		const plan = planAssetRetention({
			currentNames: new Set(),
			ledger: [
				'empty.js\t',
				'truncated.js\t17946',
				'text.js\tabc',
				`future.js\t${String(nowSeconds + daySeconds)}`,
			].join('\n'),
			now,
			remoteNames: names,
		});

		expect(plan.deletions).toEqual([]);
		expect(plan.ledger).toBe(names.map((name) => `${name}\t${String(nowSeconds)}`).join('\n'));
	});
});

const startSeconds = Date.parse('2026-11-14T00:00:00Z') / 1000;
const retentionSeconds = retentionDays * daySeconds;
const chunkNames = ['entry.js', 'chunk.js', 'fonts/lora.woff2', 'map/island.js'];

type LedgerDamage =
	{ kind: 'junk'; line: string } | { kind: 'lost' } | { kind: 'truncated'; length: number };

interface Deploy {
	advanceSeconds: number;
	currentNames: Array<string>;
	damage: LedgerDamage | undefined;
}

interface DeployOutcome {
	currentNames: ReadonlySet<string>;
	deletions: ReadonlyArray<string>;
	nowSeconds: number;
	supersededAt: ReadonlyMap<string, number>;
}

const advanceArbitrary = fc.oneof(
	fc.constantFrom(0, retentionSeconds, retentionSeconds + 1),
	fc.integer({ max: 3 * daySeconds, min: 0 }),
);

const untrustedStampArbitrary = fc.oneof(
	fc.constantFrom('', '-1', '1e10', '9999999999', ' 1794614400'),
	fc.stringMatching(/^\d{1,9}$/),
	fc.string({ maxLength: 6 }),
);

const ledgerDamageArbitrary: fc.Arbitrary<LedgerDamage> = fc.oneof(
	fc.constant({ kind: 'lost' as const }),
	fc.record({ kind: fc.constant('truncated' as const), length: fc.nat({ max: 160 }) }),
	fc.record({
		kind: fc.constant('junk' as const),
		line: fc
			.tuple(fc.constantFrom(...chunkNames), untrustedStampArbitrary)
			.map(([name, stamp]) => `${name}\t${stamp}`),
	}),
);

function deploysArbitrary(damage: fc.Arbitrary<LedgerDamage | undefined>) {
	return fc.array(
		fc.record(
			{ advanceSeconds: advanceArbitrary, currentNames: fc.subarray(chunkNames), damage },
			{ noNullPrototype: true },
		),
		{ maxLength: 30, minLength: 1, size: 'max' },
	);
}

function damageLedger(ledger: string, damage: LedgerDamage | undefined) {
	if (damage === undefined) return ledger;
	if (damage.kind === 'lost') return '';
	if (damage.kind === 'truncated') return ledger.slice(0, damage.length);

	return `${ledger}\n${damage.line}`;
}

function replayDeploys(deploys: ReadonlyArray<Deploy>) {
	const outcomes: Array<DeployOutcome> = [];
	const remoteNames = new Set<string>();
	const supersededAt = new Map<string, number>();
	let ledger = '';
	let nowSeconds = startSeconds;

	for (const deploy of deploys) {
		nowSeconds += deploy.advanceSeconds;
		ledger = damageLedger(ledger, deploy.damage);

		const currentNames = new Set(deploy.currentNames);

		for (const name of currentNames) {
			remoteNames.add(name);
			supersededAt.delete(name);
		}

		for (const name of remoteNames) {
			if (!currentNames.has(name) && !supersededAt.has(name)) supersededAt.set(name, nowSeconds);
		}

		const plan = planAssetRetention({
			currentNames,
			ledger,
			now: new Date(nowSeconds * 1000),
			remoteNames: [...remoteNames],
		});

		outcomes.push({
			currentNames,
			deletions: plan.deletions,
			nowSeconds,
			supersededAt: new Map(supersededAt),
		});

		for (const name of plan.deletions) {
			remoteNames.delete(name);
			supersededAt.delete(name);
		}

		ledger = plan.ledger;
	}

	return outcomes;
}

describe('planAssetRetention across deploys', () => {
	test('never deletes a chunk before it has been out of the build for seven days, however the ledger is damaged', () => {
		let deletionsAfterDamageCount = 0;

		fc.assert(
			fc.property(
				deploysArbitrary(fc.option(ledgerDamageArbitrary, { freq: 3, nil: undefined })),
				(deploys) => {
					let isLedgerDamaged = false;

					for (const [index, outcome] of replayDeploys(deploys).entries()) {
						if (deploys[index]?.damage !== undefined) isLedgerDamaged = true;

						for (const name of outcome.deletions) {
							expect(outcome.currentNames.has(name)).toBe(false);
							expect(
								outcome.nowSeconds - (outcome.supersededAt.get(name) ?? outcome.nowSeconds),
							).toBeGreaterThan(retentionSeconds);
						}

						if (isLedgerDamaged) deletionsAfterDamageCount += outcome.deletions.length;
					}
				},
			),
			{ numRuns: 300 },
		);

		expect(deletionsAfterDamageCount).toBeGreaterThan(0);
	});

	test('with an intact ledger, deletes exactly the chunks out of the build for over seven days', () => {
		let deletionCount = 0;
		let boundaryKeptCount = 0;

		fc.assert(
			fc.property(deploysArbitrary(fc.constant(undefined)), (deploys) => {
				for (const outcome of replayDeploys(deploys)) {
					const expected = [...outcome.supersededAt]
						.filter(([, seconds]) => outcome.nowSeconds - seconds > retentionSeconds)
						.map(([name]) => name);

					expect(new Set(outcome.deletions)).toEqual(new Set(expected));

					deletionCount += outcome.deletions.length;
					boundaryKeptCount += [...outcome.supersededAt.values()].filter(
						(seconds) => outcome.nowSeconds - seconds === retentionSeconds,
					).length;
				}
			}),
			{ numRuns: 300 },
		);

		expect(deletionCount).toBeGreaterThan(0);
		expect(boundaryKeptCount).toBeGreaterThan(0);
	});
});

describe('retention outlasts HTML a failed purge leaves at the edge', () => {
	const caddyfile = readFileSync(
		new URL('../../../../deploy/caddy/Caddyfile', import.meta.url),
		'utf8',
	);
	const edgeSeconds = Number(/s-maxage=(\d+)/.exec(documentCacheControl)?.[1]);

	test('the Caddyfile sends HTML the header verify-edge expects', () => {
		expect(caddyfile).toContain(`header @html Cache-Control "${documentCacheControl}"`);
	});

	test('chunks and renditions stay on the server longer than the edge keeps HTML', () => {
		expect(edgeSeconds).toBeGreaterThan(0);
		expect(edgeSeconds).toBeLessThan(retentionSeconds);
		expect(edgeSeconds * 1000).toBeLessThan(sweepWaitMs);
	});
});
