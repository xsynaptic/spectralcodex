import chalk from 'chalk';

import type { DataStoreEntry } from '../shared/data-store';

interface AllowedRatio {
	label: string;
	value: number;
}

// Canonical aspect ratios for the photo library
const ALLOWED_RATIOS = [
	{ label: '4:3', value: 4 / 3 },
	{ label: '3:4', value: 3 / 4 },
	{ label: '3:2', value: 3 / 2 },
	{ label: '2:3', value: 2 / 3 },
	{ label: '1:1', value: 1 },
] as const satisfies ReadonlyArray<AllowedRatio>;

// Decimal tolerance on width/height; tight enough to surface mis-cropped photos
const RATIO_TOLERANCE = 0.01;

// Screenshots and demo captures have arbitrary dimensions by nature
// This folder also contains old photos yet to be redone
const EXEMPT_PREFIXES = ['errata/'];

function getNearestRatio(ratio: number): { allowed: AllowedRatio; delta: number } {
	let nearest: AllowedRatio = ALLOWED_RATIOS[0];
	let smallestDelta = Math.abs(ratio - nearest.value);

	for (const candidate of ALLOWED_RATIOS) {
		const delta = Math.abs(ratio - candidate.value);

		if (delta < smallestDelta) {
			smallestDelta = delta;
			nearest = candidate;
		}
	}

	return { allowed: nearest, delta: smallestDelta };
}

interface FlaggedImage {
	id: string;
	width: number;
	height: number;
	ratio: number;
	nearest: string;
	delta: number;
}

export function collectAspectRatioIssues(entries: Array<DataStoreEntry>) {
	const flagged: Array<FlaggedImage> = [];

	let checkedCount = 0;

	for (const entry of entries) {
		if (EXEMPT_PREFIXES.some((prefix) => entry.id.startsWith(prefix))) continue;

		const { width, height } = entry.data;

		if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) {
			continue;
		}

		checkedCount += 1;

		const ratio = width / height;
		const { allowed, delta } = getNearestRatio(ratio);

		if (delta <= RATIO_TOLERANCE) continue;

		flagged.push({ id: entry.id, width, height, ratio, nearest: allowed.label, delta });
	}

	flagged.sort((a, b) => a.id.localeCompare(b.id));

	return { flagged, checkedCount };
}

export function checkImageAspectRatios(entries: Array<DataStoreEntry>) {
	const { flagged, checkedCount } = collectAspectRatioIssues(entries);

	if (flagged.length === 0) {
		console.log(chalk.green(`✓ ${checkedCount.toString()} image aspect ratios valid`));
		return true;
	}

	for (const item of flagged) {
		console.log(
			chalk.red(
				`❌ ${item.id}: ${item.width.toString()}×${item.height.toString()} ` +
					`(ratio ${item.ratio.toFixed(3)}, nearest ${item.nearest} off by ${item.delta.toFixed(3)})`,
			),
		);
	}

	console.log(
		chalk.yellow(
			`⚠️  Found ${flagged.length.toString()} of ${checkedCount.toString()} image(s) with non-standard aspect ratios`,
		),
	);

	return false;
}
