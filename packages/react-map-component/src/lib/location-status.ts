import type { LocationStatus } from '@spectralcodex/map-types';

import { LocationStatusEnum } from '@spectralcodex/map-types';

import { tailwindColors } from './tailwind-colors';

export interface LocationStatusMetadata {
	title: string;
	title_zh: string;
	description: string;
	color: string;
	stroke: string;
	colorDark: string;
	strokeDark: string;
}

export const LocationStatusRecords = {
	[LocationStatusEnum.Operational]: {
		title: 'Operational',
		title_zh: '經營中',
		description: 'Still in business, typically for something close to its original purpose.',
		color: tailwindColors.emerald500,
		stroke: tailwindColors.emerald600,
		colorDark: tailwindColors.emerald400,
		strokeDark: tailwindColors.emerald500,
	},
	[LocationStatusEnum.Public]: {
		title: 'Public',
		title_zh: '公有',
		description:
			'Open to the public as an attraction of some kind, or otherwise appreciable from the surrounding area.',
		color: tailwindColors.green500,
		stroke: tailwindColors.green600,
		colorDark: tailwindColors.green500,
		strokeDark: tailwindColors.green600,
	},
	[LocationStatusEnum.Restored]: {
		title: 'Restored',
		title_zh: '修復',
		description: 'This building or site has been restored.',
		color: tailwindColors.lime400,
		stroke: tailwindColors.lime500,
		colorDark: tailwindColors.lime400,
		strokeDark: tailwindColors.lime500,
	},
	[LocationStatusEnum.Converted]: {
		title: 'Converted',
		title_zh: '改建',
		description:
			'The structure is intact but it has been converted for some other use than originally intended.',
		color: tailwindColors.yellow400,
		stroke: tailwindColors.yellow500,
		colorDark: tailwindColors.yellow500,
		strokeDark: tailwindColors.yellow600,
	},
	[LocationStatusEnum.Private]: {
		title: 'Private',
		title_zh: '私有',
		description:
			'Private sites that are either still occupied, patrolled, or otherwise inaccessible.',
		color: tailwindColors.amber400,
		stroke: tailwindColors.amber500,
		colorDark: tailwindColors.amber500,
		strokeDark: tailwindColors.amber600,
	},
	[LocationStatusEnum.Idle]: {
		title: 'Idle',
		title_zh: '閒置',
		description:
			'Closed but not necessarily abandoned, or recognized for its heritage value but awaiting restoration.',
		color: tailwindColors.orange400,
		stroke: tailwindColors.orange500,
		colorDark: tailwindColors.orange500,
		strokeDark: tailwindColors.orange600,
	},
	[LocationStatusEnum.Abandoned]: {
		title: 'Abandoned',
		title_zh: '廢墟',
		description: 'Abandoned to the elements, with or without security to prevent entry.',
		color: tailwindColors.red500,
		stroke: tailwindColors.red600,
		colorDark: tailwindColors.red500,
		strokeDark: tailwindColors.red600,
	},
	[LocationStatusEnum.Remnants]: {
		title: 'Remnants',
		title_zh: '遺跡',
		description:
			'Mostly demolished or transformed beyond recognition but some traces remain, though they may be minor.',
		color: tailwindColors.red700,
		stroke: tailwindColors.red800,
		colorDark: tailwindColors.red700,
		strokeDark: tailwindColors.red800,
	},
	[LocationStatusEnum.Demolished]: {
		title: 'Demolished',
		title_zh: '被拆除',
		description: 'Completely demolished and vanished into the mists of time.',
		color: tailwindColors.zinc600,
		stroke: tailwindColors.zinc200,
		colorDark: tailwindColors.zinc600,
		strokeDark: tailwindColors.zinc200,
	},
	[LocationStatusEnum.Unknown]: {
		title: 'Unknown',
		title_zh: '不明',
		description: 'The status of this location is unknown.',
		color: tailwindColors.zinc800,
		stroke: tailwindColors.zinc300,
		colorDark: tailwindColors.zinc800,
		strokeDark: tailwindColors.zinc300,
	},
} as const satisfies Record<LocationStatus, LocationStatusMetadata>;

// MapLibre expects some style properties to have at least two items
function isDoubleStringArray(array: Array<string>): array is [string, string, ...Array<string>] {
	return array.every((item) => typeof item === 'string') && array.length >= 2;
}

function getColorMap(
	styleRecord: typeof LocationStatusRecords,
	prop: keyof (typeof LocationStatusRecords)[keyof typeof LocationStatusRecords],
) {
	const colorMap = Object.entries(styleRecord).flatMap(([status, values]) => [
		status,
		values[prop],
	]);

	if (isDoubleStringArray(colorMap)) {
		return colorMap;
	}
	throw new Error(`Invalid color map: ${colorMap.join(', ')}`);
}

// This creates an array of status and color values for use with clusters in MapLibre
export const statusColorArray = getColorMap(LocationStatusRecords, 'color');
export const statusColorDarkArray = getColorMap(LocationStatusRecords, 'colorDark');
export const statusStrokeColorArray = getColorMap(LocationStatusRecords, 'stroke');
export const statusStrokeColorDarkArray = getColorMap(LocationStatusRecords, 'strokeDark');
