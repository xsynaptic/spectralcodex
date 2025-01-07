import { stripTags } from '@spectralcodex/unified';
import * as R from 'remeda';

export const textClipper = (
	text: string,
	options: { wordCount: number; trailer?: string | undefined },
): string => {
	const words = text.split(' ');

	if (words.length <= options.wordCount) {
		return text;
	}

	const trailer = options.trailer ?? '...';

	return R.pipe(words, R.take(options.wordCount), R.join(' ')) + trailer;
};

// Function to remove specified MDX components from text
export const stripMdxComponents = (string: string, componentNames: Array<string>): string => {
	const regex = new RegExp(
		componentNames.map((name) => `<${name}(?:[^>.]*)>|</${name}>`).join('|'),
		'gm',
	);

	return string.replace(regex, '').trim();
};

export const formatNumber = ({
	number,
	locales,
	options,
}: {
	number: string | number;
	locales?: Intl.LocalesArgument | undefined;
	options?: Intl.NumberFormatOptions | undefined;
}) => new Intl.NumberFormat(locales ?? 'en', options).format(Number(number));

// Another rough function to do 80% of what is needed here
const encodeHtmlEntities = (text: string): string =>
	text
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;');

// Sanitize image captions before returning them for display
export const sanitizeCaption = (string: string): string =>
	string.replaceAll('<p>', '').replaceAll('</p>', '');

// Sanitize alt attributes before returning them for display
export const sanitizeAltAttribute = (string: string): string =>
	encodeHtmlEntities(stripTags(string));
