import { z } from 'zod';

import type { ContentMetadataItem } from '#lib/metadata/metadata-types.ts';

import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';
import { loadJsonData } from '#lib/utils/data.ts';

const RelatedContentItemSchema = z.record(
	z.string(),
	z
		.object({
			id: z.string(),
			collection: z.string(),
			score: z.number(), // Float
		})
		.array(),
);

export async function getRelatedContentFunction() {
	const relatedContent = await loadJsonData('content-related.json');

	const relatedContentParsed = await RelatedContentItemSchema.parseAsync(relatedContent);

	const metadataIndex = await getContentMetadataIndex();

	return function getRelatedContent(id: string, threshold: number): Array<ContentMetadataItem> {
		const related = relatedContentParsed[id];

		if (!related) return [];

		return related
			.filter((item) => item.score >= threshold)
			.map((item) => metadataIndex.get(item.id))
			.filter((item) => item !== undefined);
	};
}
