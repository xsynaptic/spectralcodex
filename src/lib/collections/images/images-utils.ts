import { getImagesCollection } from '#lib/collections/images/images-data.ts';

export async function getImageByIdFunction() {
	const { imagesMap } = await getImagesCollection();

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
