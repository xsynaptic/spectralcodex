import { getImagesCollection } from '@/lib/collections/images/data';

// Common utility function for converting an image ID into actual content
export async function getImageById(id: string | undefined) {
	if (!id) return;

	if (typeof id !== 'string') console.warn('Image ID is not a string:', JSON.stringify(id));

	const { imagesMap } = await getImagesCollection();

	const entry = imagesMap.get(id);

	if (!entry) {
		throw new Error(`Image not found: ${id}`);
	}

	return entry;
}

export async function getImageByIdFunction() {
	const { imagesMap } = await getImagesCollection();

	return function getImageById(id: string | undefined) {
		if (!id) return;

		if (typeof id !== 'string') console.warn('Image ID is not a string:', JSON.stringify(id));

		const entry = imagesMap.get(id);

		if (!entry) {
			throw new Error(`Image not found: ${id}`);
		}

		return entry;
	};
}
