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
	test('returns short input untouched', () => {
		expect(textClipper('A short sentence.', { wordCount: 100 })).toBe('A short sentence.');
	});

	test('returns input untouched at exactly the word count', () => {
		expect(textClipper('one two three', { wordCount: 3 })).toBe('one two three');
	});

	test('clips an English sentence identically to whitespace splitting', () => {
		expect(textClipper('The quick brown fox jumps over the lazy dog', { wordCount: 4 })).toBe(
			'The quick brown fox...',
		);
	});

	test('keeps punctuation attached to the last clipped word', () => {
		expect(textClipper('Hello there, world and beyond', { wordCount: 2 })).toBe('Hello there,...');
	});

	test('supports a custom trailer', () => {
		expect(textClipper('one two three four', { trailer: '…', wordCount: 2 })).toBe('one two…');
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
	test('strips the named tags, paired and self-closing', () => {
		expect(stripMdxComponents('One <Img src="a.jpg" /> two <More />three', ['Img', 'More'])).toBe(
			'One  two three',
		);
	});

	test('leaves a component whose name merely starts with a stripped name', () => {
		expect(stripMdxComponents('a <ImgGroup cols={2}>x</ImgGroup> b', ['Img'])).toBe(
			'a <ImgGroup cols={2}>x</ImgGroup> b',
		);
	});

	test('trims what the stripped tags leave behind', () => {
		expect(stripMdxComponents('<Img src="a.jpg" />\nHello\n', ['Img'])).toBe('Hello');
	});
});

describe('refineTypography', () => {
	test('three hyphens become an em dash before two become an en dash', () => {
		expect(refineTypography('Taipei --- Tainan')).toBe('Taipei — Tainan');
		expect(refineTypography('1990--1995')).toBe('1990–1995');
	});

	test('three dots become an ellipsis', () => {
		expect(refineTypography('Wait...')).toBe('Wait…');
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

	test('a single quote opens in the same positions and closes elsewhere', () => {
		expect(refineTypography("'Hello'")).toBe('‘Hello’');
		expect(refineTypography("she said 'hi'")).toBe('she said ‘hi’');
	});

	test('an apostrophe mid-word becomes a right single quote', () => {
		expect(refineTypography("don't")).toBe('don’t');
	});
});

describe('sanitizeImageAltAttribute', () => {
	test('strips tags and keeps their text', () => {
		expect(sanitizeImageAltAttribute('<em>Hello</em> <strong>world</strong>')).toBe('Hello world');
	});

	test('decodes entities back to plain characters', () => {
		// A bare ampersand is escaped by the rehype round trip, then decoded back
		expect(sanitizeImageAltAttribute('Tom & Jerry')).toBe('Tom & Jerry');
		expect(sanitizeImageAltAttribute('Tom &amp; Jerry')).toBe('Tom & Jerry');
		expect(sanitizeImageAltAttribute('5 &lt; 10')).toBe('5 < 10');
		expect(sanitizeImageAltAttribute('a&nbsp;b')).toBe('a b');
	});

	test('leaves an entity nobody recognizes as written', () => {
		expect(sanitizeImageAltAttribute('&foo; stays')).toBe('&foo; stays');
	});

	test('collapses whitespace runs and trims', () => {
		expect(sanitizeImageAltAttribute('  a   b \n c  ')).toBe('a b c');
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
	test('applies smart punctuation', () => {
		expect(renderMarkdownInline('"Hello" world')).toContain('“Hello”');
	});

	test('wraps a CJK run in the cjk-text class', () => {
		expect(renderMarkdownInline('Taipei 臺北 city')).toContain('cjk-text');
	});

	test('output carries no surrounding whitespace', () => {
		expect(renderMarkdownInline('Hello')).not.toMatch(/^\s|\s$/);
	});
});
