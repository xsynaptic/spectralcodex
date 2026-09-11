import { beforeEach, describe, expect, test, vi } from 'vitest';

const { readFileMock } = vi.hoisted(() => ({ readFileMock: vi.fn() }));

vi.mock('astro:env/server', () => ({ CONTENT_DATA_PATH: 'content' }));
vi.mock('node:fs/promises', () => ({ readFile: readFileMock }));

function makeMention(fields: Record<string, unknown>) {
	return JSON.stringify({
		'wm-id': 1,
		'wm-source': 'https://reader.example/reply',
		'wm-target': 'https://spectralcodex.com/some-post/',
		'wm-received': '2026-01-01T00:00:00.000Z',
		'wm-property': 'like-of',
		...fields,
	});
}

// Mentions load once per module instance; every test needs its own
async function loadWebmentions(lines: Array<string>) {
	readFileMock.mockResolvedValue(lines.join('\n'));

	const { getWebmentionsFunction } = await import('#components/webmentions/webmentions-data.ts');

	return getWebmentionsFunction();
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
		]);

		expect(getWebmentions(['/some-post'])?.likeCount).toBe(2);
		expect(getWebmentions(['/'])?.likeCount).toBe(1);
		expect(getWebmentions(['/other-post/'])).toBeUndefined();
	});

	test('drops replies backfed from our own accounts', async () => {
		const getWebmentions = await loadWebmentions([
			makeMention({
				'wm-property': 'in-reply-to',
				author: { name: 'Spectral Codex', url: 'https://BSKY.app/profile/spectralcodex.com/' },
			}),
			makeMention({
				'wm-property': 'in-reply-to',
				author: { name: 'A Reader', url: 'https://reader.example/' },
			}),
		]);

		const summary = getWebmentions(['/some-post/']);

		expect(summary?.replies.map((reply) => reply.authorName)).toEqual(['A Reader']);
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
