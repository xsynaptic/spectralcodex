import { z } from 'astro:content';

import type { LanguageCode } from './i18n-types.ts';

import { LanguageCodeEnum } from './i18n-types.ts';

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
 * @returns Object with language-suffixed Zod schema properties
 */
function createMultilingualSchemas<T extends string>(key: T) {
	type MultilingualSchemas = Record<`${T}_${LanguageCode}`, z.ZodOptional<z.ZodString>>;

	const schemas: MultilingualSchemas = {} as MultilingualSchemas;

	for (const languageCode of Object.values(LanguageCodeEnum)) {
		schemas[`${key}_${languageCode}`] = z.string().optional();
	}

	return schemas;
}

/**
 * Multilingual content schemas for this project
 */
export const titleMultilingualSchema = createMultilingualSchemas('title');

export const nameMultilingualSchema = createMultilingualSchemas('name');

export const publisherMultilingualSchema = createMultilingualSchemas('publisher');
