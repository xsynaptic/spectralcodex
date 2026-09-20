import Keyv from 'keyv';
import { describe, expect, test, vi } from 'vitest';

import { createDescriptionRenderers, getDescription } from '#lib/utils/description.ts';

function setup() {
	const cache = new Keyv();
	const setSpy = vi.spyOn(cache, 'set');

	return { setSpy, ...createDescriptionRenderers({ cache }) };
}

describe('createDescriptionRenderers', () => {
	test('keeps inline emphasis in html and strips it from text', async () => {
		const { getDescriptionRendered } = setup();

		const rendered = await getDescriptionRendered({
			data: { description: 'A *thoroughly* ordinary place.' },
			id: 'alpha',
		});

		expect(rendered?.html).toBe('A <em>thoroughly</em> ordinary place.');
		expect(rendered?.text).toBe('A thoroughly ordinary place.');
	});

	test('serves a repeat call from the cache', async () => {
		const { getDescriptionRendered, setSpy } = setup();
		const entry = { data: { description: 'A place.' }, id: 'alpha' };

		const first = await getDescriptionRendered(entry);
		const second = await getDescriptionRendered(entry);

		expect(second).toEqual(first);
		expect(setSpy).toHaveBeenCalledTimes(1);
	});

	test('collapses whitespace runs in the plain-text form', async () => {
		const { getDescriptionRendered } = setup();

		const rendered = await getDescriptionRendered({
			data: { description: 'A  thoroughly   ordinary place.' },
			id: 'alpha',
		});

		expect(rendered?.text).toBe('A thoroughly ordinary place.');
	});

	test('an entry with neither a description nor a body renders nothing', async () => {
		const { getDescriptionRendered, setSpy } = setup();

		expect(await getDescriptionRendered({ data: {}, id: 'alpha' })).toBeUndefined();
		expect(setSpy).not.toHaveBeenCalled();
	});

	test('changed source invalidates the cached entry', async () => {
		const { getDescriptionRendered, setSpy } = setup();

		await getDescriptionRendered({ data: { description: 'A place.' }, id: 'alpha' });

		const second = await getDescriptionRendered({
			data: { description: 'Another place.' },
			id: 'alpha',
		});

		expect(second?.text).toBe('Another place.');
		expect(setSpy).toHaveBeenCalledTimes(2);
	});
});

describe('getDescription', () => {
	test('the frontmatter description wins over the body', () => {
		expect(getDescription({ body: 'Body text.', data: { description: 'Front matter.' } })).toBe(
			'Front matter.',
		);
	});

	test('falls back to a clipped excerpt with components and footnote markers removed', () => {
		const entry = { body: '  <Img src="a.jpg" /> A place worth visiting.[^1]  ', data: {} };

		expect(getDescription(entry, { wordCount: 3 })).toBe('A place worth...');
		expect(getDescription(entry)).toBe('A place worth visiting.');
	});

	test('neither a description nor a body answers undefined', () => {
		expect(getDescription({ data: {} })).toBeUndefined();
	});
});
