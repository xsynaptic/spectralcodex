import { stripTags } from '@spectralcodex/unified';
import * as R from 'remeda';

export function textClipper(
	text: string,
	options: { wordCount: number; trailer?: string | undefined },
): string {
	const words = text.split(' ');

	if (words.length <= options.wordCount) {
		return text;
	}

	const trailer = options.trailer ?? '...';

	return R.pipe(words, R.take(options.wordCount), R.join(' ')) + trailer;
}

// Function to remove specified MDX components from text
export function stripMdxComponents(string: string, componentNames: Array<string>): string {
	const regex = new RegExp(
		componentNames.map((name) => `<${name}(?:[^>.]*)>|</${name}>`).join('|'),
		'gm',
	);

	return string.replace(regex, '').trim();
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
function encodeHtmlEntities(text: string): string {
	return text
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;');
}

// Sanitize image captions before returning them for display
export function sanitizeCaption(string: string): string {
	return string.replaceAll('<p>', '').replaceAll('</p>', '');
}

// Sanitize alt attributes before returning them for display
export function sanitizeAltAttribute(string: string): string {
	return encodeHtmlEntities(stripTags(string));
}
