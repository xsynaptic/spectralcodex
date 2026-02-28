import { getImagesCollection } from '#lib/collections/images/images-data.ts';

async function createImageByIdFunction() {
	const { entriesMap: imagesMap } = await getImagesCollection();

	return function getImageById(id: string | undefined) {
		if (!id) return;

		if (typeof id !== 'string') {
			console.warn('Image ID is not a string:', JSON.stringify(id));
			return;
		}

		const entry = imagesMap.get(id);

		if (!entry) {
			if (import.meta.env.DEV) {
				console.warn(`Image not found: ${id}`);
			}
			return;
		}

		return entry;
	};
}

let imageByIdFunction: ReturnType<typeof createImageByIdFunction> | undefined;

export async function getImageByIdFunction() {
	if (!imageByIdFunction) {
		imageByIdFunction = createImageByIdFunction();
	}
	return imageByIdFunction;
}
