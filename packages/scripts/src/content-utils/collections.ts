import path from 'node:path';
import * as R from 'remeda';
import { z } from 'zod';

export const ContentCollectionsEnum = {
	Ephemera: 'ephemera',
	Locations: 'locations',
	Pages: 'pages',
	Posts: 'posts',
	Regions: 'regions',
	Resources: 'resources',
	Series: 'series',
	Themes: 'themes',
	Timeline: 'timeline',
} as const;

export type ContentCollectionRecord = Record<keyof typeof ContentCollectionsEnum, string>;

export const getContentCollectionPaths = (
	rootPath: string,
	contentPath: string,
	collectionsPath = 'collections',
): ContentCollectionRecord => {
	return R.mapToObj(R.entries(ContentCollectionsEnum), ([id, collection]) => [
		id,
		path.join(rootPath, contentPath, collectionsPath, collection),
	]);
};

export const ImageFeaturedSchema = z.union([
	z.string(),
	z.object({ id: z.string() }),
	z.array(z.union([z.string(), z.object({ id: z.string() })])),
]);
