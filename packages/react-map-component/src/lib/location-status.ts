import type { LocationStatus } from '@spectralcodex/shared/map';

import { LocationStatusEnum } from '@spectralcodex/shared/map';

import { tailwindColors } from '#lib/tailwind-colors.ts';

export interface LocationStatusMetadata {
	color: string;
	colorDark: string;
	description: string;
	stroke: string;
	strokeDark: string;
	title: string;
	title_zh: string;
}

export const LocationStatusRecords = {
	[LocationStatusEnum.Abandoned]: {
		color: tailwindColors.red500,
		colorDark: tailwindColors.red500,
		description: 'Abandoned to the elements, with or without security to prevent entry.',
		stroke: tailwindColors.red600,
		strokeDark: tailwindColors.red600,
		title: 'Abandoned',
		title_zh: '廢墟',
	},
	[LocationStatusEnum.Active]: {
		color: tailwindColors.emerald500,
		colorDark: tailwindColors.emerald400,
		description: 'In business, typically for something close to its original purpose.',
		stroke: tailwindColors.emerald600,
		strokeDark: tailwindColors.emerald500,
		title: 'Active',
		title_zh: '經營中',
	},
	[LocationStatusEnum.Converted]: {
		color: tailwindColors.yellow400,
		colorDark: tailwindColors.yellow400,
		description:
			'The structure is intact but it has been converted for some other use than originally intended.',
		stroke: tailwindColors.yellow500,
		strokeDark: tailwindColors.yellow500,
		title: 'Converted',
		title_zh: '改建',
	},
	[LocationStatusEnum.Idle]: {
		color: tailwindColors.orange400,
		colorDark: tailwindColors.orange500,
		description:
			'Closed but not necessarily abandoned, or recognized for its heritage value but awaiting restoration.',
		stroke: tailwindColors.orange500,
		strokeDark: tailwindColors.orange600,
		title: 'Idle',
		title_zh: '閒置',
	},
	[LocationStatusEnum.Private]: {
		color: tailwindColors.amber400,
		colorDark: tailwindColors.amber500,
		description:
			'Private sites that are either still occupied, patrolled, or otherwise inaccessible.',
		stroke: tailwindColors.amber500,
		strokeDark: tailwindColors.amber600,
		title: 'Private',
		title_zh: '私有',
	},
	[LocationStatusEnum.Public]: {
		color: tailwindColors.green500,
		colorDark: tailwindColors.green500,
		description:
			'Open to the public as an attraction of some kind, or otherwise appreciable from the surrounding area.',
		stroke: tailwindColors.green600,
		strokeDark: tailwindColors.green600,
		title: 'Public',
		title_zh: '公有',
	},
	[LocationStatusEnum.Remnants]: {
		color: tailwindColors.red700,
		colorDark: tailwindColors.red600,
		description:
			'Mostly dismantled or transformed beyond recognition but some traces remain, though they may be minor.',
		stroke: tailwindColors.red800,
		strokeDark: tailwindColors.red700,
		title: 'Remnants',
		title_zh: '遺跡',
	},
	[LocationStatusEnum.Unknown]: {
		color: tailwindColors.zinc800,
		colorDark: tailwindColors.zinc800,
		description: 'The status of this location is unknown.',
		stroke: tailwindColors.zinc400,
		strokeDark: tailwindColors.zinc400,
		title: 'Unknown',
		title_zh: '不明',
	},
	[LocationStatusEnum.Vanished]: {
		color: tailwindColors.zinc600,
		colorDark: tailwindColors.zinc600,
		description: 'Vanished into the mists of time.',
		stroke: tailwindColors.zinc200,
		strokeDark: tailwindColors.zinc200,
		title: 'Vanished',
		title_zh: '已消失',
	},
} as const satisfies Record<LocationStatus, LocationStatusMetadata>;

// Filter panel order; the record above is lookup only
export const locationStatusOrder: ReadonlyArray<LocationStatus> = [
	LocationStatusEnum.Active,
	LocationStatusEnum.Public,
	LocationStatusEnum.Converted,
	LocationStatusEnum.Private,
	LocationStatusEnum.Idle,
	LocationStatusEnum.Abandoned,
	LocationStatusEnum.Remnants,
	LocationStatusEnum.Vanished,
	LocationStatusEnum.Unknown,
];

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

// MapLibre expects some style properties to have at least two items
function isDoubleStringArray(array: Array<string>): array is [string, string, ...Array<string>] {
	return array.every((item) => typeof item === 'string') && array.length >= 2;
}

// This creates an array of status and color values for use with clusters in MapLibre
export const statusColorArray = getColorMap(LocationStatusRecords, 'color');
export const statusColorDarkArray = getColorMap(LocationStatusRecords, 'colorDark');
export const statusStrokeColorArray = getColorMap(LocationStatusRecords, 'stroke');
export const statusStrokeColorDarkArray = getColorMap(LocationStatusRecords, 'strokeDark');
