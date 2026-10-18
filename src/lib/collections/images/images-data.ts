import pMemoize from 'p-memoize';

import { createCollectionData } from '#lib/utils/collections.ts';

export const getImagesCollection = createCollectionData({ collection: 'images', label: 'Images' });

export const getImageByIdFunction = pMemoize(async () => {
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
});
