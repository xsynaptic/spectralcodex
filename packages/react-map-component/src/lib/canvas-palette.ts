import type { LocationStatus } from '@spectralcodex/shared/map';

import { LocationStatusRecords, tailwindColors } from '@spectralcodex/shared/map';
import * as R from 'remeda';

export type ClusterRamp = readonly [string, string, string, string];

export type StatusColors = Readonly<Record<LocationStatus, string>>;

interface CanvasPalette {
	clusterFill: ClusterRamp;
	clusterLabel: string;
	clusterLabelHalo: string;
	clusterStroke: ClusterRamp;
	connectionLink: string;
	connectionPoints: string;
	divisionFill: string;
	divisionHalo: string;
	divisionOutline: string;
	label: string;
	labelHalo: string;
	statusFill: StatusColors;
	statusStroke: StatusColors;
	statusTint: StatusColors;
	target: string;
}

const clusterRampBright = [
	tailwindColors.sky600,
	tailwindColors.sky500,
	tailwindColors.sky400,
	tailwindColors.sky300,
] as const;

const clusterRampDeep = [
	tailwindColors.sky700,
	tailwindColors.sky600,
	tailwindColors.sky500,
	tailwindColors.sky400,
] as const;

const modelessRoles = {
	clusterLabel: tailwindColors.sky50,
	clusterLabelHalo: 'rgba(0, 0, 0, 0.2)',
	statusTint: R.mapValues(LocationStatusRecords, (record) => record.tint),
};

const canvasPalette: Record<'dark' | 'light', CanvasPalette> = {
	dark: {
		...modelessRoles,
		clusterFill: clusterRampDeep,
		clusterStroke: clusterRampBright,
		connectionLink: tailwindColors.stone400,
		connectionPoints: tailwindColors.sky400,
		divisionFill: tailwindColors.zinc500,
		divisionHalo: tailwindColors.red600,
		divisionOutline: tailwindColors.red500,
		label: tailwindColors.zinc200,
		labelHalo: 'rgba(0, 0, 0, 0.4)',
		statusFill: R.mapValues(LocationStatusRecords, (record) => record.colorDark),
		statusStroke: R.mapValues(LocationStatusRecords, (record) => record.strokeDark),
		target: tailwindColors.sky400,
	},
	light: {
		...modelessRoles,
		clusterFill: clusterRampBright,
		clusterStroke: clusterRampDeep,
		connectionLink: tailwindColors.stone500,
		connectionPoints: tailwindColors.sky500,
		divisionFill: tailwindColors.stone400,
		divisionHalo: tailwindColors.red500,
		divisionOutline: tailwindColors.red400,
		label: tailwindColors.zinc700,
		labelHalo: 'rgba(255, 255, 255, 0.8)',
		statusFill: R.mapValues(LocationStatusRecords, (record) => record.color),
		statusStroke: R.mapValues(LocationStatusRecords, (record) => record.stroke),
		target: tailwindColors.sky500,
	},
};

export const canvasStatuses = R.keys(LocationStatusRecords);

export function getCanvasPalette(isDarkMode: boolean) {
	return isDarkMode ? canvasPalette.dark : canvasPalette.light;
}
