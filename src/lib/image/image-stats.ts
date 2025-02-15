import { FEATURE_IMAGE_COLLECTION } from '@/constants';
import { getImagesCollection } from '@/lib/collections/images/data';

export async function getImageCount() {
	if (FEATURE_IMAGE_COLLECTION) {
		const { images } = await getImagesCollection();

		return images.length;
	}
	return 0;
}
