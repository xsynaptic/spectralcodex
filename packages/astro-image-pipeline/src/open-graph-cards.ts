import type { ImageFormat } from '#image-name.ts';

import { isImageStem } from '#image-name.ts';
import { recordOpenGraphCard } from '#image-recorder.ts';

export type OpenGraphCardValue =
	Array<OpenGraphCardValue> | boolean | number | OpenGraphCardObject | string;

interface OpenGraphCardObject {
	[key: string]: OpenGraphCardValue | undefined;
}

export type OpenGraphCardInput = OpenGraphCardObject;

export interface OpenGraphCardImage {
	id: string;
	treatment?: string;
}

export interface OpenGraphCard {
	image?: OpenGraphCardImage;
	input: OpenGraphCardInput;
}

function canonicalizeValue(value: OpenGraphCardValue): OpenGraphCardValue {
	if (Array.isArray(value)) return value.map((item) => canonicalizeValue(item));

	if (typeof value === 'object') return canonicalizeObject(value);

	if (typeof value === 'number' && !Number.isFinite(value)) {
		throw new TypeError(
			`OpenGraph card input can't hold ${String(value)}; JSON has no such number`,
		);
	}

	return value;
}

function compareCodeUnits(first: string, second: string) {
	if (first < second) return -1;

	if (first > second) return 1;

	return 0;
}

function canonicalizeObject(value: OpenGraphCardObject) {
	const sorted: OpenGraphCardObject = {};

	for (const key of Object.keys(value).toSorted(compareCodeUnits)) {
		const entry = value[key];

		if (entry !== undefined) sorted[key] = canonicalizeValue(entry);
	}

	return sorted;
}

export function canonicalizeOpenGraphCard({ image, input }: OpenGraphCard): OpenGraphCard {
	const canonicalInput = canonicalizeObject(input);

	if (!image) return { input: canonicalInput };

	const canonicalImage: OpenGraphCardImage =
		image.treatment === undefined ? { id: image.id } : { id: image.id, treatment: image.treatment };

	return { image: canonicalImage, input: canonicalInput };
}

export function defineOpenGraphCards({ format }: { format: ImageFormat }) {
	function getCardName({ id, ...card }: OpenGraphCard & { id: string }) {
		if (!isImageStem(id)) {
			throw new Error(
				`OpenGraph card ${id} can't be named: whitespace, quotes, &, <, >, ), commas and "." or ".." segments don't fit in a URL`,
			);
		}

		const name = `${id}.${format}`;

		recordOpenGraphCard(name, canonicalizeOpenGraphCard(card));

		return name;
	}

	return { getCardName };
}
