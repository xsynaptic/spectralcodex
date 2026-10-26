import { describe, expect, test } from 'vitest';

import {
	formatStringTemplate,
	refineTypography,
	renderMarkdownInline,
	sanitizeImageAltAttribute,
	stripFootnoteReferences,
	stripFootnotes,
	stripMdxComponents,
	textClipper,
} from '#lib/utils/text.ts';

describe('textClipper', () => {
	test('returns input untouched up to exactly the word count', () => {
		expect(textClipper('A short sentence.', { wordCount: 100 })).toBe('A short sentence.');
		expect(textClipper('one two three', { wordCount: 3 })).toBe('one two three');
	});

	test.each([
		{
			expected: 'The quick brown fox...',
			input: 'The quick brown fox jumps over the lazy dog',
			options: { wordCount: 4 },
		},
		{ expected: 'one two…', input: 'one two three four', options: { trailer: '…', wordCount: 2 } },
	])(
		'clips English identically to whitespace splitting: $expected',
		({ expected, input, options }) => {
			expect(textClipper(input, options)).toBe(expected);
		},
	);

	test('keeps punctuation attached to the last clipped word', () => {
		expect(textClipper('Hello there, world and beyond', { wordCount: 2 })).toBe('Hello there,...');
	});

	test('clips pure CJK text without spaces', () => {
		const input = '臺灣是一個位於東亞的島嶼國家擁有豐富的歷史與文化';
		const clipped = textClipper(input, { wordCount: 4 });

		expect(clipped.length).toBeLessThan(input.length + 3);
		expect(clipped.endsWith('...')).toBe(true);
		expect(input.startsWith(clipped.slice(0, -3))).toBe(true);
	});

	test('clips mixed Chinese and English text', () => {
		const clipped = textClipper('Taipei 臺北 is the capital of Taiwan 臺灣', { wordCount: 3 });

		expect(clipped).toBe('Taipei 臺北 is...');
	});
});

describe('stripMdxComponents', () => {
	test('strips the named tags and trims what they leave behind', () => {
		expect(stripMdxComponents('One <Img src="a.jpg" /> two <More />three', ['Img', 'More'])).toBe(
			'One  two three',
		);
		expect(stripMdxComponents('<Img src="a.jpg" />\nHello\n', ['Img'])).toBe('Hello');
	});

	test('leaves a component whose name merely starts with a stripped name', () => {
		expect(stripMdxComponents('a <ImgGroup cols={2}>x</ImgGroup> b', ['Img'])).toBe(
			'a <ImgGroup cols={2}>x</ImgGroup> b',
		);
	});
});

describe('refineTypography', () => {
	test.each([
		['Taipei --- Tainan', 'Taipei — Tainan'],
		['1990--1995', '1990–1995'],
		['Wait...', 'Wait…'],
	])('%s becomes %s, em dash before en dash', (input, expected) => {
		expect(refineTypography(input)).toBe(expected);
	});

	test('a double quote opens at the start, after a space, and after a bracket', () => {
		expect(refineTypography('"Hello"')).toBe('“Hello”');
		expect(refineTypography('she said "hi" then')).toBe('she said “hi” then');
		expect(refineTypography('("hi")')).toBe('(“hi”)');
		expect(refineTypography('["hi"]')).toBe('[“hi”]');
	});

	test('a double quote opens after a dash the same pass just created', () => {
		expect(refineTypography('Taipei---"the north"')).toBe('Taipei—“the north”');
	});

	test('a single quote opens in the same positions and otherwise closes or marks an apostrophe', () => {
		expect(refineTypography("'Hello'")).toBe('‘Hello’');
		expect(refineTypography("she said 'hi'")).toBe('she said ‘hi’');
		expect(refineTypography("don't")).toBe('don’t');
	});
});

describe('sanitizeImageAltAttribute', () => {
	test('decodes entities back to plain characters and collapses whitespace', () => {
		// A bare ampersand is escaped by the rehype round trip, then decoded back
		expect(sanitizeImageAltAttribute('Tom & Jerry')).toBe('Tom & Jerry');
		expect(sanitizeImageAltAttribute('Tom &amp; Jerry')).toBe('Tom & Jerry');
		expect(sanitizeImageAltAttribute('5 &lt; 10')).toBe('5 < 10');
		expect(sanitizeImageAltAttribute('a&nbsp;b')).toBe('a b');
		expect(sanitizeImageAltAttribute('  a   b \n c  ')).toBe('a b c');
	});

	test('leaves an entity nobody recognizes as written', () => {
		expect(sanitizeImageAltAttribute('&foo; stays')).toBe('&foo; stays');
	});
});

describe('stripFootnotes', () => {
	const html = [
		'Text<sup><a href="#user-content-fn-1" data-footnote-ref aria-describedby="footnote-label">10</a></sup> more.',
		'<section data-footnotes class="footnotes">',
		'<h2 id="footnote-label">Footnotes</h2>',
		'<ol>',
		'<li>A note</li>',
		'</ol>',
		'</section>',
	].join('\n');

	test('removes the reference marker and the whole multi-line footnotes section', () => {
		expect(stripFootnotes(html)).toBe('Text more.\n');
	});
});

describe('stripFootnoteReferences', () => {
	test('removes numeric and named markers alike', () => {
		expect(stripFootnoteReferences('Text[^1] and[^foo] more[^123].')).toBe('Text and more.');
	});
});

describe('formatStringTemplate', () => {
	test('interpolates named placeholders and stringifies numbers', () => {
		expect(formatStringTemplate('Chronology: {month} {year}', { month: 'May', year: 2018 })).toBe(
			'Chronology: May 2018',
		);
	});

	test('a zero is interpolated, not treated as absent', () => {
		expect(formatStringTemplate('{count} entries', { count: 0 })).toBe('0 entries');
	});

	test('a placeholder with no value becomes an empty string', () => {
		expect(formatStringTemplate('a {missing} b')).toBe('a  b');
		expect(formatStringTemplate('a {missing} b', { other: 'x' })).toBe('a  b');
	});
});

describe('renderMarkdownInline', () => {
	test('applies smart punctuation and wraps a CJK run in the cjk-text class', () => {
		expect(renderMarkdownInline('"Hello" world')).toContain('“Hello”');
		expect(renderMarkdownInline('Taipei 臺北 city')).toContain('cjk-text');
	});
});
