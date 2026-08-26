import Keyv from 'keyv';
import { describe, expect, test, vi } from 'vitest';

import { createDescriptionRenderers } from '#lib/utils/description.ts';

function setup() {
	const cache = new Keyv();
	const setSpy = vi.spyOn(cache, 'set');

	return { setSpy, ...createDescriptionRenderers({ cache }) };
}

describe('createDescriptionRenderers', () => {
	test('keeps inline emphasis in html and strips it from text', async () => {
		const { getDescriptionRendered } = setup();

		const rendered = await getDescriptionRendered({
			id: 'alpha',
			data: { description: 'A *thoroughly* ordinary place.' },
		});

		expect(rendered?.html).toBe('A <em>thoroughly</em> ordinary place.');
		expect(rendered?.text).toBe('A thoroughly ordinary place.');
	});

	test('serves a repeat call from the cache', async () => {
		const { getDescriptionRendered, setSpy } = setup();
		const entry = { id: 'alpha', data: { description: 'A place.' } };

		const first = await getDescriptionRendered(entry);
		const second = await getDescriptionRendered(entry);

		expect(second).toEqual(first);
		expect(setSpy).toHaveBeenCalledTimes(1);
	});

	test('changed source invalidates the cached entry', async () => {
		const { getDescriptionRendered, setSpy } = setup();

		await getDescriptionRendered({ id: 'alpha', data: { description: 'A place.' } });

		const second = await getDescriptionRendered({
			id: 'alpha',
			data: { description: 'Another place.' },
		});

		expect(second?.text).toBe('Another place.');
		expect(setSpy).toHaveBeenCalledTimes(2);
	});
});
