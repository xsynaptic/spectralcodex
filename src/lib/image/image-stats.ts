import { FEATURE_IMAGE_COLLECTION } from '#constants.ts';
import { getImagesCollection } from '#lib/collections/images/data.ts';

export async function getImageCount() {
	if (FEATURE_IMAGE_COLLECTION) {
		const { images } = await getImagesCollection();

		return images.length;
	}
	return 0;
}
