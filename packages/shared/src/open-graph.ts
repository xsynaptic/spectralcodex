import { getCardName } from '@xsynaptic/astro-image-pipeline/names';
import { z } from 'zod';

// Minimum dimensions recommended by Facebook (1.91:1 aspect ratio)
export const openGraphImageWidth = 1200;
export const openGraphImageHeight = 630;
export const openGraphImageFormat = 'jpg';

export const openGraphBasePath = 'og';

export const openGraphBlurTreatment = 'blur';

export const OpenGraphCardTitlesSchema = z.object({
	title: z.string(),
	titleJa: z.string().optional(),
	titleTh: z.string().optional(),
	titleZh: z.string().optional(),
});

export type OpenGraphCardTitles = z.infer<typeof OpenGraphCardTitlesSchema>;

export interface PageOpenGraphCard {
	id: string;
	image: { id: string; isBlurred: boolean };
	titles: OpenGraphCardTitles;
}

export function getOpenGraphId(id: string): string {
	return id.replaceAll('/', '-');
}

export function getOpenGraphCardPath({ id, image, titles }: PageOpenGraphCard): string {
	const name = getCardName(
		{
			id: getOpenGraphId(id),
			image: image.isBlurred
				? { id: image.id, treatment: openGraphBlurTreatment }
				: { id: image.id },
			input: titles,
		},
		{ format: openGraphImageFormat },
	);

	return `${openGraphBasePath}/${name}`;
}
