import { describe, expect, test } from 'vitest';

import { textClipper } from './text';

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
		expect(textClipper('one two three four', { wordCount: 2, trailer: '…' })).toBe('one two…');
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

	test('returns short CJK input untouched', () => {
		expect(textClipper('臺北', { wordCount: 100 })).toBe('臺北');
	});
});
