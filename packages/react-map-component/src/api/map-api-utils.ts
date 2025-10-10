import type { MapPopupItemInput, MapSourceItemInput } from '../types';

import { MapPopupItemSchema, MapSourceItemSchema } from '../types/map-schemas';

export function parseSourceData(sourceDataRaw: Array<MapSourceItemInput>) {
	const parsedResponse = MapSourceItemSchema.array().safeParse(sourceDataRaw);

	if (!parsedResponse.success) {
		console.error('[Map] Source data parse error:', parsedResponse.error);
		throw new Error('Failed to parse source data');
	}

	return parsedResponse.data;
}

export function parsePopupData(popupDataRaw: Array<MapPopupItemInput>) {
	const parsedResponse = MapPopupItemSchema.array().safeParse(popupDataRaw);

	if (!parsedResponse.success) {
		console.error('[Map] Popup data parse error:', parsedResponse.error);
		throw new Error('Failed to parse popup data');
	}

	return parsedResponse.data;
}
