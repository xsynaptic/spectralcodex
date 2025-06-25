import { locationStatusStyle } from '../config/colors';

// MapLibre expects some style properties to have at least two items
export const isDoubleStringArray = (
	array: Array<string>,
): array is [string, string, ...Array<string>] =>
	array.every((item) => typeof item === 'string') && array.length >= 2;

export const getColorMap = (
	styleRecord: typeof locationStatusStyle,
	prop: keyof (typeof locationStatusStyle)[keyof typeof locationStatusStyle],
) => {
	const colorMap = Object.entries(styleRecord).flatMap(([status, values]) => [
		status,
		values[prop],
	]);

	return isDoubleStringArray(colorMap) ? colorMap : undefined;
};

// This creates an array of status and color values for use with clusters in MapLibre
export const statusColorMap = getColorMap(locationStatusStyle, 'color');
export const statusStrokeColorMap = getColorMap(locationStatusStyle, 'stroke');
