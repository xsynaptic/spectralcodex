export const mapPointIdSeparator = ':';

function slugify(text: string) {
	return text
		.replaceAll(/['"‘’“”]/g, '')
		.replaceAll('&', 'and')
		.replaceAll(/[^A-Za-z0-9]+/g, '-')
		.toLowerCase()
		.replaceAll(/^-|-$/g, '');
}

function splitMapRowId(id: string) {
	const separatorIndex = id.indexOf(mapPointIdSeparator);

	if (separatorIndex === -1) return { entryId: id, pointSuffix: '' };

	return { entryId: id.slice(0, separatorIndex), pointSuffix: id.slice(separatorIndex) };
}

function getIdResidual(entryId: string, slug: string) {
	if (entryId === slug) return '';
	if (slug !== '' && entryId.endsWith(`-${slug}`)) return entryId.slice(0, -slug.length);

	return;
}

export function getMapRowUrl(id: string) {
	return `/${splitMapRowId(id).entryId}/`;
}

export function decodeMapRowId(stored: string, title: string) {
	const { entryId, pointSuffix } = splitMapRowId(stored);

	if (entryId !== '' && !entryId.endsWith('-')) return stored;

	return `${entryId}${slugify(title)}${pointSuffix}`;
}

export function encodeMapRowId(id: string, title: string) {
	const { entryId, pointSuffix } = splitMapRowId(id);
	const residual = getIdResidual(entryId, slugify(title));

	if (residual !== undefined && decodeMapRowId(`${residual}${pointSuffix}`, title) === id) {
		return `${residual}${pointSuffix}`;
	}
	if (decodeMapRowId(id, title) !== id) {
		throw new Error(`[Map codec] Location "${id}" would decode as a title residual`);
	}

	return id;
}
