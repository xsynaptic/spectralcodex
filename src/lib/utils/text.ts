import { stripTags } from '@spectralcodex/unified-tools';

export function textClipper(
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

// Sanitize image captions before returning them for display
export function sanitizeCaption(input: string): string {
	return input.replaceAll('<p>', '').replaceAll('</p>', '');
}

// Sanitize alt attributes before returning them for display
export function sanitizeAltAttribute(input: string): string {
	return encodeHtmlEntities(stripTags(input));
}
