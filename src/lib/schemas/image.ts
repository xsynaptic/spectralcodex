import { z } from 'zod';

export const ImageThumbnailSchema = z.object({
	src: z.string(),
	srcSet: z.string(),
	height: z.string(),
	width: z.string(),
});

export type ImageThumbnail = z.infer<typeof ImageThumbnailSchema>;
