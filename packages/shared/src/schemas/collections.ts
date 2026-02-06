import { z } from 'zod';

export const ContentCollectionsEnum = {
	Archives: 'archives',
	Ephemera: 'ephemera',
	Locations: 'locations',
	Pages: 'pages',
	Posts: 'posts',
	Regions: 'regions',
	Resources: 'resources',
	Series: 'series',
	Themes: 'themes',
} as const;

// Data store references are resolved to {id, collection}
export const RegionsSchema = z
	.object({ id: z.string(), collection: z.literal(ContentCollectionsEnum.Regions) })
	.transform((value) => value.id)
	.array();

export const ThemesSchema = z
	.object({ id: z.string(), collection: z.literal(ContentCollectionsEnum.Themes) })
	.transform((value) => value.id)
	.array();
