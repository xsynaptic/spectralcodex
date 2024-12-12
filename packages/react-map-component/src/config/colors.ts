import { tailwindConfig } from '@spectralcodex/tailwind/config';

import type { LocationStatus } from '../types/map-locations';

const { colors } = tailwindConfig.theme;

type TailwindDeprecatedColors = 'lightBlue' | 'warmGray' | 'trueGray' | 'coolGray' | 'blueGray';

type TailwindSchemeKey = keyof Omit<
	typeof tailwindConfig.theme.colors,
	'inherit' | 'current' | 'transparent' | 'black' | 'white' | TailwindDeprecatedColors
>;

export const getMapClusterStyle = (scheme: TailwindSchemeKey) => ({
	circleSmFill: colors[scheme][600],
	circleSmStroke: colors[scheme][700],
	circleMdFill: colors[scheme][500],
	circleMdStroke: colors[scheme][600],
	circleLgFill: colors[scheme][400],
	circleLgStroke: colors[scheme][500],
	circleXlFill: colors[scheme][300],
	circleXlStroke: colors[scheme][400],
	countTextColor: colors[scheme][50],
});

export const locationStatusStyle: Record<LocationStatus, { color: string; stroke: string }> = {
	operational: {
		color: colors.emerald[500],
		stroke: colors.emerald[600],
	},
	public: {
		color: colors.green[500],
		stroke: colors.green[600],
	},
	restored: {
		color: colors.lime[500],
		stroke: colors.lime[600],
	},
	converted: {
		color: colors.yellow[500],
		stroke: colors.yellow[600],
	},
	private: {
		color: colors.amber[500],
		stroke: colors.amber[600],
	},
	idle: {
		color: colors.orange[500],
		stroke: colors.orange[600],
	},
	abandoned: {
		color: colors.red[600],
		stroke: colors.red[700],
	},
	remnants: {
		color: colors.red[800],
		stroke: colors.red[900],
	},
	demolished: {
		color: colors.primary[600],
		stroke: colors.primary[200],
	},
	unknown: {
		color: colors.primary[800],
		stroke: colors.primary[300],
	},
};
