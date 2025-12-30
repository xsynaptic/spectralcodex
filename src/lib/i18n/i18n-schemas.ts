import { z } from 'zod';

import type { LanguageCode } from '#lib/types/index.ts';

import { StylizedTextSchema } from '#lib/schemas/index.ts';
import { LanguageCodeEnum } from '#lib/types/index.ts';

/**
 * Utility type that creates a multilingual type structure for a given base property name.
 * Generates optional properties like `${BaseProp}_${LanguageCode}` for each supported language.
 */
export type MultilingualSchemaSet<BaseProp extends string> = {
	[K in LanguageCode as `${BaseProp}_${K}`]?: string;
};

/**
 * Creates a multilingual schema object for a given base property name.
 * Returns an object with properties like `${key}_${languageCode}` for each supported language.
 *
 * @param key - The base property name (e.g., 'title', 'description')
 * @param schema - Optional custom Zod schema that produces a string type
 * @returns Object with language-suffixed Zod schema properties
 */
function createMultilingualSchemas<T extends string>(
	key: T,
	schema: z.ZodType<string> = z.string(),
) {
	type MultilingualSchemas = Record<`${T}_${LanguageCode}`, z.ZodOptional<z.ZodType<string>>>;

	const schemas: MultilingualSchemas = {} as MultilingualSchemas;

	for (const languageCode of Object.values(LanguageCodeEnum)) {
		schemas[`${key}_${languageCode}`] = schema.optional();
	}

	return schemas;
}

/**
 * Multilingual content schemas for this project
 */
export const titleMultilingualSchema = createMultilingualSchemas('title', StylizedTextSchema);

export const nameMultilingualSchema = createMultilingualSchemas('name');

export const publisherMultilingualSchema = createMultilingualSchemas('publisher');
