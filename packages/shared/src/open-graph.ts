import { getCardName } from '@xsynaptic/astro-image-pipeline/names';
import { z } from 'zod';

const OpenGraphVariantSchema = z.enum(['landscape', 'story']);

export type OpenGraphVariant = z.infer<typeof OpenGraphVariantSchema>;

export const openGraphVariants = {
	landscape: { height: 630, width: 1200 },
	story: { height: 1920, width: 1080 },
} as const satisfies Record<OpenGraphVariant, { height: number; width: number }>;

export const openGraphDefaultVariant = 'landscape' satisfies OpenGraphVariant;

export const openGraphImageWidth = openGraphVariants.landscape.width;
export const openGraphImageHeight = openGraphVariants.landscape.height;
export const openGraphImageFormat = 'jpg';

export const openGraphBasePath = 'og';

export const openGraphBlurTreatment = 'blur';

const OpenGraphCardTitlesSchema = z.strictObject({
	title: z.string(),
	titleJa: z.string().optional(),
	titleTh: z.string().optional(),
	titleZh: z.string().optional(),
});

export type OpenGraphCardTitles = z.infer<typeof OpenGraphCardTitlesSchema>;

const OpenGraphCardHomepageSchema = z.strictObject({
	description: z.string(),
	template: z.literal('homepage'),
	title: z.string(),
});

const OpenGraphCardAtlasSchema = z.strictObject({
	countLabel: z.string(),
	template: z.literal('atlas'),
	title: z.string(),
	titleZh: z.string().optional(),
});

export type OpenGraphCardInput =
	| OpenGraphCardTitles
	| z.infer<typeof OpenGraphCardAtlasSchema>
	| z.infer<typeof OpenGraphCardHomepageSchema>;

const variantShape = { variant: OpenGraphVariantSchema.optional() };

export const OpenGraphCardRecordSchema = z.union([
	OpenGraphCardHomepageSchema.extend(variantShape),
	OpenGraphCardAtlasSchema.extend(variantShape),
	OpenGraphCardTitlesSchema.extend(variantShape),
]);

export type OpenGraphCardRecord = z.infer<typeof OpenGraphCardRecordSchema>;

export type OpenGraphCardTemplate = ResolvedOpenGraphCardInput['template'];

export type ResolvedOpenGraphCardInput =
	| (OpenGraphCardTitles & { template: 'standard' })
	| z.infer<typeof OpenGraphCardAtlasSchema>
	| z.infer<typeof OpenGraphCardHomepageSchema>;

export const openGraphTemplateVariants = {
	atlas: ['landscape'],
	homepage: ['landscape'],
	standard: ['landscape', 'story'],
} as const satisfies Record<OpenGraphCardTemplate, ReadonlyArray<OpenGraphVariant>>;

export function resolveOpenGraphCardInput(input: OpenGraphCardInput): ResolvedOpenGraphCardInput {
	if ('template' in input) return input;

	return { ...input, template: 'standard' };
}

export interface PageOpenGraphCard {
	id: string;
	image: { id: string; isBlurred: boolean };
	input: OpenGraphCardInput;
}

export function getOpenGraphId(id: string): string {
	return id.replaceAll('/', '-');
}

export function getOpenGraphCardPath(
	{ id, image, input }: PageOpenGraphCard,
	variant: OpenGraphVariant = openGraphDefaultVariant,
): string {
	const { template } = resolveOpenGraphCardInput(input);
	const variants: ReadonlyArray<OpenGraphVariant> = openGraphTemplateVariants[template];

	if (!variants.includes(variant)) {
		throw new Error(`The ${template} template draws no ${variant} card for ${id}`);
	}

	const isDefaultVariant = variant === openGraphDefaultVariant;
	const name = getCardName(
		{
			id: isDefaultVariant ? getOpenGraphId(id) : `${variant}/${getOpenGraphId(id)}`,
			image: image.isBlurred
				? { id: image.id, treatment: openGraphBlurTreatment }
				: { id: image.id },
			input: isDefaultVariant ? input : { ...input, variant },
		},
		{ format: openGraphImageFormat },
	);

	return `${openGraphBasePath}/${name}`;
}
