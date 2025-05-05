import type { LocationStatus } from '@spectralcodex/map-types';

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

export const locationStatusStyle: Record<LocationStatus, { color: string; stroke: string }> = {
	/** Emerald */
	operational: {
		color: '#10b981',
		stroke: '#059669',
	},
	/** Green */
	public: {
		color: '#22c55e',
		stroke: '#16a34a',
	},
	/** Lime */
	restored: {
		color: '#84cc16',
		stroke: '#65a30d',
	},
	/** Yellow */
	converted: {
		color: '#eab308',
		stroke: '#ca8a04',
	},
	/** Amber */
	private: {
		color: '#f59e0b',
		stroke: '#d97706',
	},
	/** Orange */
	idle: {
		color: '#f97316',
		stroke: '#ea580c',
	},
	/** Red */
	abandoned: {
		color: '#dc2626',
		stroke: '#b91c1c',
	},
	/** Red (darker) */
	remnants: {
		color: '#991b1b',
		stroke: '#7f1d1d',
	},
	/** Zinc */
	demolished: {
		color: '#52525b',
		stroke: '#e4e4e7',
	},
	/** Zinc (darker) */
	unknown: {
		color: '#27272a',
		stroke: '#d4d4d8',
	},
};
