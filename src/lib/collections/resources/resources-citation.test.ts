import { describe, expect, test } from 'vitest';

import type { ResourceSource } from '#lib/collections/resources/resources-utils.ts';

import { buildSourceCitations } from '#lib/collections/resources/resources-citation.ts';

function makeSource(data: Record<string, unknown>) {
	return { resourceType: 'book', ...data } as unknown as ResourceSource;
}

describe('buildSourceCitations', () => {
	test('joins authors, title and publication details with the English delimiter', () => {
		const { primary } = buildSourceCitations(
			makeSource({
				authors: [{ name: 'Paul D. Barclay' }],
				publishedDate: '2017',
				publishedDetails: 'Oakland, California',
				publisher: 'University of California Press',
				title: 'Outcasts of Empire',
			}),
		);

		expect(primary?.authors).toBe('Paul D. Barclay');
		expect(primary?.title).toBe('Outcasts of Empire');
		expect(primary?.published).toBe('University of California Press, 2017, Oakland, California');
	});

	test('joins multiple authors with an ampersand', () => {
		const { primary } = buildSourceCitations(
			makeSource({ authors: [{ name: 'One' }, { name: 'Two' }], title: 'A Title' }),
		);

		expect(primary?.authors).toBe('One & Two');
	});

	test('quotes a Chinese title and switches to full-width punctuation', () => {
		const { multilingual } = buildSourceCitations(
			makeSource({
				authors: [{ name: 'Li Yuanjie', name_zh: '李元傑' }],
				publishedDate: '2018-04',
				publishedDetails_zh: '第59輯',
				publisher_zh: '雲林縣政府',
				title: 'A Brief History of Movie Theaters in Mailiao',
				title_zh: '麥寮地區戲院小史',
			}),
		);

		expect(multilingual?.lang).toBe('zh');
		expect(multilingual?.authors).toBe('李元傑');
		expect(multilingual?.title).toBe('《麥寮地區戲院小史》');
		expect(multilingual?.published).toBe('雲林縣政府，2018-04，第59輯');
	});

	test('quotes a Japanese title with corner brackets', () => {
		const { multilingual } = buildSourceCitations(
			makeSource({ authors: [{ name_ja: '著者' }], title: 'A Title', title_ja: '日本語' }),
		);

		expect(multilingual?.lang).toBe('ja');
		expect(multilingual?.title).toBe('『日本語』');
		expect(multilingual?.authors).toBe('著者');
	});

	// Regression: the previous implementation built this citation, then discarded it at render
	test('formats a regional variant using its base language punctuation', () => {
		const { multilingual } = buildSourceCitations(
			makeSource({ title: 'A Title', 'title_zh-Hans': '书' }),
		);

		expect(multilingual?.title).toBe('《书》');
		expect(multilingual?.lang).toBe('zh-Hans');
	});

	// Regression: the delimiter was previously dropped when no publisher accompanied the details
	test('delimits published details that arrive without a publisher', () => {
		const { multilingual } = buildSourceCitations(
			makeSource({ publishedDetails_zh: '第59輯', title: 'A Title', title_zh: '書' }),
		);

		expect(multilingual?.published).toBe('第59輯');
		expect(multilingual?.title).toBe('《書》');
	});

	// Regression: an empty array previously rendered a leading delimiter
	test('omits authors entirely when the list is empty', () => {
		const { primary } = buildSourceCitations(
			makeSource({ authors: [], publisher: 'A Publisher', title: 'A Title' }),
		);

		expect(primary?.authors).toBeUndefined();
		expect(primary?.published).toBe('A Publisher');
	});

	test('omits authors when none carry a name in the citation language', () => {
		const { multilingual } = buildSourceCitations(
			makeSource({ authors: [{ name: 'No Chinese Name' }], title: 'A Title', title_zh: '書' }),
		);

		expect(multilingual?.authors).toBeUndefined();
	});

	test('skips the multilingual citation for a language without citation punctuation', () => {
		const { multilingual } = buildSourceCitations(
			makeSource({ title: 'A Title', title_th: 'ชื่อเรื่อง' }),
		);

		expect(multilingual).toBeUndefined();
	});

	test('returns no citation for a source without a title', () => {
		const { primary } = buildSourceCitations(makeSource({ publisher: 'A Publisher' }));

		expect(primary).toBeUndefined();
	});

	test('links only a source that has an entry of its own', () => {
		const linked = buildSourceCitations(
			makeSource({ id: 'outcasts-of-empire', showPage: true, title: 'A Title' }),
		);
		const unlisted = buildSourceCitations(
			makeSource({ id: 'outcasts-of-empire', showPage: false, title: 'A Title' }),
		);
		const inline = buildSourceCitations(makeSource({ title: 'A Title' }));

		expect(linked.url).toContain('/resources/outcasts-of-empire');
		expect(unlisted.url).toBeUndefined();
		expect(inline.url).toBeUndefined();
	});
});
