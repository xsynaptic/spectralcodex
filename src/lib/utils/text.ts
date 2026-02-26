import { stripTags, transformMarkdown } from '@xsynaptic/unified-tools';
import * as R from 'remeda';

import { MDX_COMPONENTS_TO_STRIP } from '#constants.ts';

function textClipper(
	input: string,
	options: { wordCount: number; trailer?: string | undefined },
): string {
	const words = input.split(' ');

	if (words.length <= options.wordCount) {
		return input;
	}

	const trailer = options.trailer ?? '...';

	return words.slice(0, options.wordCount).join(' ') + trailer;
}

// Function to remove specified MDX components from text
export function stripMdxComponents(input: string, componentNames: Array<string>): string {
	const regex = new RegExp(
		componentNames.map((name) => `<${name}(?:[^>.]*)>|</${name}>`).join('|'),
		'gm',
	);

	return input.replace(regex, '').trim();
}

export function formatNumber({
	number,
	locales,
	options,
}: {
	number: string | number;
	locales?: Intl.LocalesArgument | undefined;
	options?: Intl.NumberFormatOptions | undefined;
}) {
	return new Intl.NumberFormat(locales ?? 'en', options).format(Number(number));
}

// Another rough function to do 80% of what is needed here
function encodeHtmlEntities(input: string): string {
	return input
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;');
}

// Strip footnote references from text (*e.g.*, [^1], [^foo], [^123])
function stripFootnoteReferences(input: string) {
	return input.replaceAll(/\[\^[^\]]+\]/g, '');
}

// Simple text-only SEO description that accepts a variety of things you might throw at it
export function sanitizeDescription(description: string | undefined) {
	return description
		? R.pipe(
				description,
				stripFootnoteReferences,
				(description) => stripMdxComponents(description, MDX_COMPONENTS_TO_STRIP),
				(description) => transformMarkdown({ input: description }),
				stripTags,
				(stripped) => textClipper(stripped, { wordCount: 100 }),
			)
		: undefined;
}

// Sanitize image captions before returning them for display
export function sanitizeCaption(input: string): string {
	return input.replaceAll('<p>', '').replaceAll('</p>', '');
}

// Sanitize alt attributes before returning them for display
export function sanitizeAltAttribute(input: string): string {
	return encodeHtmlEntities(stripTags(input));
}

// Strip combining diacritical marks for display font compatibility (e.g. "Shōka" → "Shoka")
export function stripDiacritics(input: string): string {
	return input.normalize('NFD').replaceAll(/[\u0300-\u036F]/g, '');
}

// Interpolate named placeholders in a string *e.g.* "{year}/{month} Archives"
export function formatStringTemplate(
	template: string,
	values: Record<string, string | number> = {},
): string {
	return template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}
