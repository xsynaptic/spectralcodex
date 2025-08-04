import { stylizeText } from '@spectralcodex/unified-tools';
import { z } from 'astro:content';

// Title schema; apply SmartyPants to arbitrary strings
export const TitleSchema = z.string().transform((value) => stylizeText(value));

// Descriptions should meet basic SEO requirements
const DESCRIPTION_CHARACTER_LENGTH = 30;

// Markdown may be present so we don't further transform the value
export const DescriptionSchema = z.string().min(DESCRIPTION_CHARACTER_LENGTH, {
	message: `Descriptions must be ${String(DESCRIPTION_CHARACTER_LENGTH)} or more characters long.`,
});

// Date schema
export const DateStringSchema = z.string().transform((value) => new Date(value));

// Numeric scale schema, from 1 to 5; used by locations and timelines
export const NumericScaleSchema = z.number().int().min(1).max(5);
