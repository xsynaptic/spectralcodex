import type { ContentEntry } from '#shared/astro-content.ts';

import { toValidationResult } from '#validate-content/validation-result.ts';

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

interface FlaggedImage {
	delta: number;
	height: number;
	id: string;
	nearest: string;
	ratio: number;
	width: number;
}

interface ImageDimensions {
	height: number;
	ratio: number;
	width: number;
}

interface RatioTallyRow {
	count: number;
	label: string;
	orientation: string;
	value: number;
}

export function collectAspectRatioIssues(entries: Array<ContentEntry>) {
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

		const { height, ratio, width } = dimensions;
		const { allowed, delta } = getNearestRatio(ratio);

		if (delta <= ratioTolerance) {
			tally.set(allowed.label, (tally.get(allowed.label) ?? 0) + 1);
			continue;
		}

		flagged.push({ delta, height, id: entry.id, nearest: allowed.label, ratio, width });
	}

	flagged.sort((a, b) => a.id.localeCompare(b.id));

	const tallyRows = allowedRatios.map((allowed) => ({
		count: tally.get(allowed.label) ?? 0,
		label: allowed.label,
		orientation: getOrientation(allowed.value),
		value: allowed.value,
	})) satisfies Array<RatioTallyRow>;

	return { checkedCount, exemptCount, flagged, tally: tallyRows };
}

export function validateImageAspectRatios(
	entries: Array<ContentEntry>,
	{ showStats = false }: { showStats?: boolean } = {},
) {
	const { checkedCount, exemptCount, flagged, tally } = collectAspectRatioIssues(entries);

	const exemptNote = exemptCount > 0 ? ` (${exemptCount.toString()} exempt)` : '';

	return {
		...toValidationResult(
			flagged.map((item) => ({
				message:
					`${item.id}: ${item.width.toString()}×${item.height.toString()} ` +
					`(ratio ${item.ratio.toFixed(3)}, nearest ${item.nearest} off by ${item.delta.toFixed(3)})`,
			})),
			{
				fail: `Found ${flagged.length.toString()} of ${checkedCount.toString()} image(s) with non-standard aspect ratios${exemptNote}`,
				pass: `${checkedCount.toString()} image aspect ratios valid${exemptNote}`,
			},
		),
		notes: showStats ? formatRatioTally(tally) : [],
	};
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

function getImageDimensions(entry: ContentEntry): ImageDimensions | undefined {
	const { height, width } = entry.data;

	if (typeof width !== 'number' || typeof height !== 'number') return undefined;
	if (width <= 0 || height <= 0) return undefined;

	return { height, ratio: width / height, width };
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

function getOrientation(value: number) {
	if (value > 1) return 'landscape';
	if (value < 1) return 'portrait';

	return 'square';
}
