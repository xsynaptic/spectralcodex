import { describe, expect, test } from 'vitest';

import {
	getOpenGraphCardPath,
	OpenGraphCardRecordSchema,
	resolveOpenGraphCardInput,
} from '#open-graph.ts';

const card = {
	id: 'taiwan/taipei/some-location',
	image: { id: 'taiwan/taipei/some-location-1.jpg', isBlurred: false },
	input: { title: 'Some Location' },
};

describe('getOpenGraphCardPath', () => {
	test('landscape keeps the flat path whether or not the variant is named', () => {
		expect(getOpenGraphCardPath(card)).toBe('og/taiwan-taipei-some-location.jpg');
		expect(getOpenGraphCardPath(card, 'landscape')).toBe('og/taiwan-taipei-some-location.jpg');
	});

	test('other variants nest under their own directory', () => {
		expect(getOpenGraphCardPath(card, 'story')).toBe('og/story/taiwan-taipei-some-location.jpg');
	});

	test('a variant the template does not draw fails at record time', () => {
		const homepage = {
			id: 'index-homepage',
			image: { id: 'homepage.jpg', isBlurred: false },
			input: {
				description: 'Photo essays',
				template: 'homepage' as const,
				title: 'Spectral Codex',
			},
		};

		expect(() => getOpenGraphCardPath(homepage, 'story')).toThrow(/homepage template/);
	});
});

describe('OpenGraphCardRecordSchema', () => {
	test('a templated input keeps its template instead of parsing as standard', () => {
		const record = OpenGraphCardRecordSchema.parse({
			description: 'Photo essays',
			template: 'homepage',
			title: 'Spectral Codex',
		});

		expect(resolveOpenGraphCardInput(record).template).toBe('homepage');
	});

	test('a standard input resolves to the standard template', () => {
		const record = OpenGraphCardRecordSchema.parse({ title: 'Some Location', variant: 'story' });

		expect(resolveOpenGraphCardInput(record).template).toBe('standard');
	});

	test('a templated input missing its fields is rejected', () => {
		expect(() => OpenGraphCardRecordSchema.parse({ template: 'atlas', title: 'Atlas' })).toThrow();
	});
});
