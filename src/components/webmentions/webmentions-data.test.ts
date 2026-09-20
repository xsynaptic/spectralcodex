import { beforeEach, describe, expect, test, vi } from 'vitest';

const { readFileMock } = vi.hoisted(() => ({ readFileMock: vi.fn() }));

vi.mock('astro:env/server', () => ({ CONTENT_DATA_PATH: 'content' }));
vi.mock('node:fs/promises', () => ({ readFile: readFileMock }));

// Mentions load once per module instance; every test needs its own
async function loadWebmentions(lines: Array<string>) {
	readFileMock.mockResolvedValue(lines.join('\n'));

	const { getWebmentionsFunction } = await import('#components/webmentions/webmentions-data.ts');

	return getWebmentionsFunction();
}

function makeMention(fields: Record<string, unknown>) {
	return JSON.stringify({
		'wm-id': 1,
		'wm-property': 'like-of',
		'wm-received': '2026-01-01T00:00:00.000Z',
		'wm-source': 'https://reader.example/reply',
		'wm-target': 'https://spectralcodex.com/some-post/',
		...fields,
	});
}

beforeEach(() => {
	vi.resetModules();
	readFileMock.mockReset();
});

describe('getWebmentionsFunction', () => {
	test('matches targets by pathname regardless of origin and trailing slash', async () => {
		const getWebmentions = await loadWebmentions([
			makeMention({ 'wm-target': 'https://spectralcodex.com/some-post/' }),
			makeMention({ 'wm-target': 'http://localhost:4321/some-post' }),
			makeMention({ 'wm-target': 'https://spectralcodex.com' }),
			makeMention({ 'wm-target': 'https://spectralcodex.com/some-post//' }),
		]);

		expect(getWebmentions(['/some-post'])?.likeCount).toBe(3);
		expect(getWebmentions(['/'])?.likeCount).toBe(1);
		expect(getWebmentions(['/other-post/'])).toBeUndefined();
	});

	test('drops replies backfed from our own accounts', async () => {
		const getWebmentions = await loadWebmentions([
			makeMention({
				// Padded, mixed case, and double-slashed: all three are normalized away before the match
				author: { name: 'Spectral Codex', url: '  https://BSKY.app/profile/spectralcodex.com//  ' },
				'wm-property': 'in-reply-to',
			}),
			makeMention({
				author: { name: 'A Reader', url: 'https://reader.example/' },
				'wm-property': 'in-reply-to',
			}),
		]);

		const summary = getWebmentions(['/some-post/']);

		expect(summary?.replies.map((reply) => reply.authorName)).toEqual(['A Reader']);
	});

	test('a reply identifies its sender, oldest first, blanks resolved', async () => {
		const getWebmentions = await loadWebmentions([
			makeMention({
				author: { name: '  A Reader  ', url: '  https://reader.example/  ' },
				content: { text: '  Nice piece.  ' },
				'wm-id': 42,
				'wm-property': 'in-reply-to',
				'wm-received': '2026-02-01T00:00:00.000Z',
				'wm-source': 'https://reader.example/reply-1',
			}),
			// No h-card at all, so the sender is known by domain, with `www.` dropped
			makeMention({
				'wm-id': 43,
				'wm-property': 'mention-of',
				'wm-received': '2026-01-01T00:00:00.000Z',
				'wm-source': 'https://www.elsewhere.example/note',
			}),
			// A blank h-card and an unparseable source: nothing to attribute it to
			makeMention({
				author: { name: ' '.repeat(3) },
				'wm-id': 44,
				'wm-property': 'in-reply-to',
				'wm-source': 'not-a-url',
			}),
			// Blank strings are absent fields, not empty ones
			makeMention({
				author: { name: 'B Reader', url: ' '.repeat(3) },
				content: { text: ' '.repeat(3) },
				'wm-id': 45,
				'wm-property': 'in-reply-to',
				'wm-received': '2026-03-01T00:00:00.000Z',
				'wm-source': 'https://reader.example/reply-2',
			}),
		]);

		expect(getWebmentions(['/some-post/'])?.replies).toEqual([
			{
				authorName: 'elsewhere.example',
				authorUrl: undefined,
				dateReceived: new Date('2026-01-01T00:00:00.000Z'),
				id: 43,
				sourceUrl: 'https://www.elsewhere.example/note',
				text: undefined,
			},
			{
				authorName: 'A Reader',
				authorUrl: 'https://reader.example/',
				dateReceived: new Date('2026-02-01T00:00:00.000Z'),
				id: 42,
				sourceUrl: 'https://reader.example/reply-1',
				text: 'Nice piece.',
			},
			{
				authorName: 'B Reader',
				authorUrl: undefined,
				dateReceived: new Date('2026-03-01T00:00:00.000Z'),
				id: 45,
				sourceUrl: 'https://reader.example/reply-2',
				text: undefined,
			},
		]);
	});

	test('skips blank lines and records that fail the schema', async () => {
		const getWebmentions = await loadWebmentions([
			makeMention({ 'wm-property': 'like-of' }),
			'',
			' '.repeat(3),
			makeMention({ 'wm-id': 'not-a-number' }),
			makeMention({ 'wm-property': 'repost-of' }),
		]);

		expect(getWebmentions(['/some-post/'])).toMatchObject({ likeCount: 1, repostCount: 1 });
	});
});
