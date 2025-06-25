import type { MapPopupItemInput, MapSourceItemInput } from '../types';

import { MapPopupItemSchema, MapSourceItemSchema } from '../types/map-schemas';

export function parseSourceData(sourceDataRaw: Array<MapSourceItemInput>) {
	const { data, success, error } = MapSourceItemSchema.array().safeParse(sourceDataRaw);

	if (!success) {
		console.error(error);
		return;
	}

	return data;
}

export function parsePopupData(popupDataRaw: Array<MapPopupItemInput>) {
	const { data, success, error } = MapPopupItemSchema.array().safeParse(popupDataRaw);

	if (!success) {
		console.error(error);
		return;
	}

	return data;
}
