import { z } from 'zod';

/**
 * This closely maps to the Cultural Heritage Preservation Act's Tangible Cultural Assets definitions
 * Note that monuments and archaeological sites are stratified into national/municipal/city/county
 * For the others, the governing authority is either municipal or city/county
 * @link https://nchdb.boch.gov.tw/law/lawSystem/en/6/30356
 * @link https://nchdb.boch.gov.tw/law/lawSystem/6/30356
 */
const LocationTwHeritageKeys = [
	'national-monument',
	'municipal-monument',
	'city-monument',
	'historic-building',
	'commemorative-building',
	'historic-building-group',
	'national-archaeological-site',
	'municipal-archaeological-site',
	'city-archaeological-site',
	'historic-site',
	'cultural-landscape',
	'natural-monument',
	'antiquity',
] as const;

export const LocationTwHeritageSchema = z.enum(LocationTwHeritageKeys);

export type LocationTwHeritage = z.output<typeof LocationTwHeritageSchema>;

export const LocationTwHeritageRecords = {
	'national-monument': {
		title: 'National Monument',
		title_zh: '國定古蹟',
	},
	'municipal-monument': {
		title: 'Municipal Monument',
		title_zh: '直轄市定古蹟',
	},
	'city-monument': {
		title: 'City Monument',
		title_zh: '縣(市)定古蹟',
	},
	'historic-building': {
		title: 'Historic Building',
		title_zh: '歷史建築',
	},
	'commemorative-building': {
		title: 'Commemorative Building',
		title_zh: '紀念建築',
	},
	'historic-building-group': {
		title: 'Historic Building Group',
		title_zh: '聚落建築群',
	},
	'national-archaeological-site': {
		title: 'National Archaeological Site',
		title_zh: '國定考古遺址',
	},
	'municipal-archaeological-site': {
		title: 'Municipal Archaeological Site',
		title_zh: '直轄市定考古遺址',
	},
	'city-archaeological-site': {
		title: 'City Archaeological Site',
		title_zh: '縣(市)定考古遺址',
	},
	'historic-site': {
		title: 'Historic Site',
		title_zh: '史蹟',
	},
	'cultural-landscape': {
		title: 'Cultural Landscape',
		title_zh: '文化景觀',
	},
	'natural-monument': {
		title: 'Natural Monument',
		title_zh: '自然紀念物',
	},
	antiquity: {
		title: 'Antiquity',
		title_zh: '古物',
	},
} as const satisfies Record<LocationTwHeritage, { title: string; title_zh: string }>;

/**
 * Internal data structure for nearby locations
 */
export const LocationsNearbyItemSchema = z.object({
	locationId: z.string(),
	distance: z.number().int(),
	distanceDisplay: z.string(),
});

export type LocationsNearbyItem = z.infer<typeof LocationsNearbyItemSchema>;
