import type { DataStoreEntry } from '../shared/data-store';

import { toValidationResult } from './validation-result';

interface AllowedRatio {
	label: string;
	value: number;
}

const allowedRatios = [
	{ label: '4:3', value: 4 / 3 },
	{ label: '3:4', value: 3 / 4 },
	{ label: '3:2', value: 3 / 2 },
	{ label: '2:3', value: 2 / 3 },
	{ label: '1:1', value: 1 },
] as const satisfies ReadonlyArray<AllowedRatio>;

// Decimal tolerance on width/height; tight enough to surface mis-cropped photos
const ratioTolerance = 0.01;

// Screenshots and demo captures have arbitrary dimensions by nature
// This folder also contains old photos yet to be redone
const exemptPrefixes = ['errata/'];

function getOrientation(value: number) {
	if (value > 1) return 'landscape';
	if (value < 1) return 'portrait';

	return 'square';
}

function getNearestRatio(ratio: number): { allowed: AllowedRatio; delta: number } {
	let nearest: AllowedRatio = allowedRatios[0];
	let smallestDelta = Math.abs(ratio - nearest.value);

	for (const candidate of allowedRatios) {
		const delta = Math.abs(ratio - candidate.value);

		if (delta < smallestDelta) {
			smallestDelta = delta;
			nearest = candidate;
		}
	}

	return { allowed: nearest, delta: smallestDelta };
}

interface ImageDimensions {
	width: number;
	height: number;
	ratio: number;
}

function getImageDimensions(entry: DataStoreEntry): ImageDimensions | undefined {
	const { width, height } = entry.data;

	if (typeof width !== 'number' || typeof height !== 'number') return undefined;
	if (width <= 0 || height <= 0) return undefined;

	return { width, height, ratio: width / height };
}

interface FlaggedImage {
	id: string;
	width: number;
	height: number;
	ratio: number;
	nearest: string;
	delta: number;
}

interface RatioTallyRow {
	label: string;
	value: number;
	orientation: string;
	count: number;
}

export function collectAspectRatioIssues(entries: Array<DataStoreEntry>) {
	const flagged: Array<FlaggedImage> = [];

	// Conforming images only; flagged ones are reported separately
	const tally = new Map<string, number>(allowedRatios.map((allowed) => [allowed.label, 0]));

	let checkedCount = 0;
	let exemptCount = 0;

	for (const entry of entries) {
		if (exemptPrefixes.some((prefix) => entry.id.startsWith(prefix))) {
			exemptCount += 1;
			continue;
		}

		const dimensions = getImageDimensions(entry);

		if (!dimensions) continue;

		checkedCount += 1;

		const { width, height, ratio } = dimensions;
		const { allowed, delta } = getNearestRatio(ratio);

		if (delta <= ratioTolerance) {
			tally.set(allowed.label, (tally.get(allowed.label) ?? 0) + 1);
			continue;
		}

		flagged.push({ id: entry.id, width, height, ratio, nearest: allowed.label, delta });
	}

	flagged.sort((a, b) => a.id.localeCompare(b.id));

	const tallyRows = allowedRatios.map((allowed) => ({
		label: allowed.label,
		value: allowed.value,
		orientation: getOrientation(allowed.value),
		count: tally.get(allowed.label) ?? 0,
	})) satisfies Array<RatioTallyRow>;

	return { flagged, checkedCount, exemptCount, tally: tallyRows };
}

function formatRatioTally(tally: Array<RatioTallyRow>) {
	const rows = [...tally].sort((rowA, rowB) => rowB.count - rowA.count);

	const countWidth = Math.max(...rows.map((row) => String(row.count).length));
	const labelWidth = Math.max(...rows.map((row) => row.label.length));

	return rows.map(
		(row) =>
			`   ${String(row.count).padStart(countWidth)}  ` +
			`${row.label.padEnd(labelWidth)}  ${row.value.toFixed(3)}  ${row.orientation}`,
	);
}

export function validateImageAspectRatios(
	entries: Array<DataStoreEntry>,
	{ showStats = false }: { showStats?: boolean } = {},
) {
	const { flagged, checkedCount, exemptCount, tally } = collectAspectRatioIssues(entries);

	const exemptNote = exemptCount > 0 ? ` (${exemptCount.toString()} exempt)` : '';

	return {
		...toValidationResult(
			flagged.map((item) => ({
				message:
					`${item.id}: ${item.width.toString()}×${item.height.toString()} ` +
					`(ratio ${item.ratio.toFixed(3)}, nearest ${item.nearest} off by ${item.delta.toFixed(3)})`,
			})),
			{
				pass: `${checkedCount.toString()} image aspect ratios valid${exemptNote}`,
				fail: `Found ${flagged.length.toString()} of ${checkedCount.toString()} image(s) with non-standard aspect ratios${exemptNote}`,
			},
		),
		notes: showStats ? formatRatioTally(tally) : [],
	};
}
