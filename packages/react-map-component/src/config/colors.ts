import type { LocationStatus } from '@spectralcodex/map-types';

import { LocationStatusEnum } from '@spectralcodex/map-types';

/** Sky blue colors from Tailwind */
export const mapClusterStyle = {
	circleSmFill: '#0284c7',
	circleSmStroke: '#0369a1',
	circleMdFill: '#0ea5e9',
	circleMdStroke: '#0284c7',
	circleLgFill: '#38bdf8',
	circleLgStroke: '#0ea5e9',
	circleXlFill: '#7dd3fc',
	circleXlStroke: '#38bdf8',
	countTextColor: '#f0f9ff',
};

export const mapDivisionStyle = {
	fillColor: '#a6a09b',
	outlineColor: '#ff6467',
	haloColor: '#fb2c36',
};

export const locationStatusStyle: Record<LocationStatus, { color: string; stroke: string }> = {
	/** Emerald */
	[LocationStatusEnum.Operational]: {
		color: '#10b981',
		stroke: '#059669',
	},
	/** Green */
	[LocationStatusEnum.Public]: {
		color: '#22c55e',
		stroke: '#16a34a',
	},
	/** Lime */
	[LocationStatusEnum.Restored]: {
		color: '#84cc16',
		stroke: '#65a30d',
	},
	/** Yellow */
	[LocationStatusEnum.Converted]: {
		color: '#eab308',
		stroke: '#ca8a04',
	},
	/** Amber */
	[LocationStatusEnum.Private]: {
		color: '#f59e0b',
		stroke: '#d97706',
	},
	/** Orange */
	[LocationStatusEnum.Idle]: {
		color: '#f97316',
		stroke: '#ea580c',
	},
	/** Red */
	[LocationStatusEnum.Abandoned]: {
		color: '#dc2626',
		stroke: '#b91c1c',
	},
	/** Red (darker) */
	[LocationStatusEnum.Remnants]: {
		color: '#991b1b',
		stroke: '#7f1d1d',
	},
	/** Zinc */
	[LocationStatusEnum.Demolished]: {
		color: '#52525b',
		stroke: '#e4e4e7',
	},
	/** Zinc (darker) */
	[LocationStatusEnum.Unknown]: {
		color: '#27272a',
		stroke: '#d4d4d8',
	},
};
