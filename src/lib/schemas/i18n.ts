import { z } from 'astro:content';

const LanguageCodeEnum = {
	ChineseMandarin: 'zh',
	Japanese: 'ja',
	Thai: 'th',
	Vietnamese: 'vi',
} as const;

type LanguageCode = (typeof LanguageCodeEnum)[keyof typeof LanguageCodeEnum];

/**
 * Utility type that creates a multilingual type structure for a given base property name.
 * Generates optional properties like `${BaseProp}_${LanguageCode}` for each supported language.
 */
type MultilingualSchemaSet<BaseProp extends string> = {
	[K in LanguageCode as `${BaseProp}_${K}`]?: string;
};

/**
 * Creates a multilingual schema object for a given base property name.
 * Returns an object with properties like `${baseProp}_${langCode}` for each supported language.
 *
 * @param baseProp - The base property name (e.g., 'title', 'description')
 * @returns Object with language-suffixed Zod schema properties
 */
function createMultilingualSchemas<T extends string>(baseProp: T) {
	type MultilingualSchemas = Record<`${T}_${LanguageCode}`, z.ZodOptional<z.ZodString>>;

	const schemas: MultilingualSchemas = {} as MultilingualSchemas;

	for (const langCode of Object.values(LanguageCodeEnum)) {
		schemas[`${baseProp}_${langCode}`] = z.string().optional();
	}

	return schemas;
}

export const titleMultilingualSchema = createMultilingualSchemas('title');

export type TitleMultilingual = MultilingualSchemaSet<'title'>;

export function getMultilingualValue(id: string, data: Record<string, unknown>) {
	for (const langCode of Object.values(LanguageCodeEnum)) {
		const key = `${id}_${langCode}`;
		const value = data[key];

		if (typeof value === 'string') {
			return value;
		}
	}
	return;
}
