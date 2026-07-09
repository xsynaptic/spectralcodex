import { trailingSlash } from '@xsynaptic/satteri-trailing-slash';
import { wrapCjk } from '@xsynaptic/satteri-wrap-cjk';
import { stripTags } from '@xsynaptic/unified-tools';
import { markdownToHtml } from 'satteri';

// Locale-independent word segmentation; split(' ') counts space-free scripts (CJK, Thai) as one word
const wordSegmenter = new Intl.Segmenter(undefined, { granularity: 'word' });

export function textClipper(
	input: string,
	options: { wordCount: number; trailer?: string | undefined },
): string {
	let wordIndex = 0;

	for (const segment of wordSegmenter.segment(input)) {
		if (!segment.isWordLike) continue;

		if (wordIndex === options.wordCount) {
			return input.slice(0, segment.index).trimEnd() + (options.trailer ?? '...');
		}

		wordIndex += 1;
	}

	return input;
}

// Function to remove specified MDX components from text
// Lookahead on the opening tag prevents prefix collisions (e.g. "Img" matching "<ImgGroup>")
export function stripMdxComponents(input: string, componentNames: Array<string>): string {
	const regex = new RegExp(
		componentNames.map((name) => String.raw`<${name}(?=[\s/>])[^>]*>|</${name}>`).join('|'),
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

/**
 * Strips GFM-style footnotes from HTML content using a simple regex approach
 */
export function stripFootnotes(input: string): string {
	// Remove footnote references (`sup` elements with footnote links)
	let result = input.replaceAll(/<sup><a[^>]*data-footnote-ref[^>]*>.*?<\/a><\/sup>/gi, '');

	// Remove the entire footnotes section
	result = result.replaceAll(/<section[^>]*data-footnotes[^>]*>.*?<\/section>/gis, '');

	return result;
}

// Strip footnote references from text (*e.g.*, [^1], [^foo], [^123])
export function stripFootnoteReferences(input: string) {
	return input.replaceAll(/\[\^[^\]]+\]/g, '');
}

// Sanitize image captions before returning them for display
export function sanitizeImageCaption(input: string): string {
	return input.replaceAll('<p>', '').replaceAll('</p>', '');
}

// Another rough function to do 80% of what is needed here
function encodeHtmlEntities(input: string): string {
	return input
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

// Sanitize alt attributes before returning them for display
export function sanitizeImageAltAttribute(input: string): string {
	return encodeHtmlEntities(stripTags(input));
}

// Interpolate named placeholders in a string *e.g.* "{year}/{month} Archives"
export function formatStringTemplate(
	template: string,
	values: Record<string, string | number> = {},
): string {
	return template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}

// Typographic refinement for short text: smart quotes, en/em dashes, ellipses
// This negates the need for a full-blown unified pipeline for titles and such
export function refineTypography(input: string): string {
	let value = input;
	// Dashes: --- to em, -- to en (longest first)
	value = value.replaceAll('---', '—').replaceAll('--', '–');
	value = value.replaceAll('...', '…');
	// Double quotes: opening after start/space/bracket/dash, otherwise closing
	value = value.replaceAll(/(^|[\s([{<–—])"/g, '$1“').replaceAll('"', '”');
	// Single quotes: opening in the same positions, otherwise apostrophe or closing
	value = value.replaceAll(/(^|[\s([{<–—])'/g, '$1‘').replaceAll("'", '’');
	return value;
}

// Render a short markdown string (descriptions, notices, teasers) to inline HTML
// CJK wrapping is plugged into the parser; stripping or sanitizing is left to callers that need it
const markdownCache = new Map<string, string>();

export function renderMarkdownInline(input: string): string {
	const cached = markdownCache.get(input);

	if (cached !== undefined) return cached;

	const { html } = markdownToHtml(input, {
		features: { smartPunctuation: true },
		hastPlugins: [wrapCjk({ value: 'cjk' }), trailingSlash({ trailingSlash: 'always' })],
	});
	const result = html.trim();

	markdownCache.set(input, result);

	return result;
}
