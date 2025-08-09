import type { BoundingBox } from './types';

// Bounding boxes for top-level/ancestral regions
export const boundingBoxes: Record<string, BoundingBox> = {
	canada: {
		latMin: 41.676_555_6,
		latMax: 83.336_212_8,
		lngMin: -141.002_75,
		lngMax: -52.323_198_1,
	},
	china: {
		latMin: 8.838_343_6,
		latMax: 53.560_815_4,
		lngMin: 73.499_734_7,
		lngMax: 134.775_456_3,
	},
	'hong-kong': {
		latMin: 22.133,
		latMax: 22.597,
		lngMin: 113.805,
		lngMax: 114.441,
	},
	indonesia: {
		latMin: -11.208_566_9,
		latMax: 6.274_449_6,
		lngMin: 94.771_712_4,
		lngMax: 141.019_444_4,
	},
	japan: {
		latMin: 20.214_581_1,
		latMax: 45.711_204_6,
		lngMin: 122.714_175_4,
		lngMax: 154.205_541,
	},
	malaysia: {
		latMin: -0.086,
		latMax: 7.025,
		lngMin: 99.34,
		lngMax: 119.292,
	},
	philippines: {
		latMin: 4.215_806_4,
		latMax: 21.321_780_6,
		lngMin: 114.095_214_5,
		lngMax: 126.807_256_2,
	},
	singapore: {
		latMin: 1.130_475_3,
		latMax: 1.450_475_3,
		lngMin: 103.692_035_9,
		lngMax: 104.012_035_9,
	},
	'south-korea': {
		latMin: 32.910_455_6,
		latMax: 38.623_477,
		lngMin: 124.354_847,
		lngMax: 132.146_780_6,
	},
	taiwan: {
		latMin: 10.374_269,
		latMax: 26.437_222_2,
		lngMin: 114.359_905_8,
		lngMax: 122.297,
	},
	'united-states': {
		latMin: 24.9493,
		latMax: 49.5904,
		lngMin: -125.0011,
		lngMax: -66.9326,
	},
	vietnam: {
		latMin: 8.179_066_5,
		latMax: 23.393_395,
		lngMin: 102.144_41,
		lngMax: 114.333_759_5,
	},
	// Includes ROC's South China Sea claims
	kaohsiung: {
		latMin: 10.326,
		latMax: 23.491,
		lngMin: 114.302,
		lngMax: 121.091,
	},
};
