import { z } from 'astro:content';

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
		titleAlt: '國定古蹟',
	},
	'municipal-monument': {
		title: 'Municipal Monument',
		titleAlt: '直轄市定古蹟',
	},
	'city-monument': {
		title: 'City Monument',
		titleAlt: '縣(市)定古蹟',
	},
	'historic-building': {
		title: 'Historic Building',
		titleAlt: '歷史建築',
	},
	'commemorative-building': {
		title: 'Commemorative Building',
		titleAlt: '紀念建築',
	},
	'historic-building-group': {
		title: 'Historic Building Group',
		titleAlt: '聚落建築群',
	},
	'national-archaeological-site': {
		title: 'National Archaeological Site',
		titleAlt: '國定考古遺址',
	},
	'municipal-archaeological-site': {
		title: 'Municipal Archaeological Site',
		titleAlt: '直轄市定考古遺址',
	},
	'city-archaeological-site': {
		title: 'City Archaeological Site',
		titleAlt: '縣(市)定考古遺址',
	},
	'historic-site': {
		title: 'Historic Site',
		titleAlt: '史蹟',
	},
	'cultural-landscape': {
		title: 'Cultural Landscape',
		titleAlt: '文化景觀',
	},
	'natural-monument': {
		title: 'Natural Monument',
		titleAlt: '自然紀念物',
	},
	antiquity: {
		title: 'Antiquity',
		titleAlt: '古物',
	},
} as const satisfies Record<LocationTwHeritage, { title: string; titleAlt: string }>;
