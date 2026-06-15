import { z } from 'zod';

import { refineTypography } from '#lib/utils/text.ts';

// Title schema; stylized text with a reasonable upper limit
const titleCharacterLength = 80;

export const TitleSchema = z
	.string()
	.max(titleCharacterLength, {
		message: `Titles must be ${String(titleCharacterLength)} characters or fewer.`,
	})
	.transform((value) => refineTypography(value).trim());

// Content dates are wall-clock values: `YYYY/MM/DD` with an optional `HH:mm` (24-hour) time
const contentDateRegex = /^\d{4}\/\d{2}\/\d{2}( \d{2}:\d{2})?$/;

export const DateStringSchema = z.string().transform((value, ctx) => {
	if (!contentDateRegex.test(value)) {
		ctx.addIssue({
			code: 'custom',
			message: `Use YYYY/MM/DD or YYYY/MM/DD HH:mm (24-hour): "${value}"`,
		});
		return z.NEVER;
	}

	const [datePart = '', timePart] = value.split(' ');
	const date = new Date(`${datePart.replaceAll('/', '-')}T${timePart ?? '00:00'}:00Z`);

	if (Number.isNaN(date.getTime())) {
		ctx.addIssue({ code: 'custom', message: `Invalid date: "${value}"` });
		return z.NEVER;
	}

	return date;
});

// Numeric scale schema, from 1 to 5; used by locations and archives
export const NumericScaleSchema = z.number().int().min(1).max(5);

// Image thumbnail schema
export const ImageThumbnailSchema = z.object({
	src: z.string(),
	srcSet: z.string(),
	height: z.string(),
	width: z.string(),
});

export type ImageThumbnail = z.infer<typeof ImageThumbnailSchema>;
