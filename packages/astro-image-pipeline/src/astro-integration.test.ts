import { describe, expect, test } from 'vitest';

import imagePipeline from '#astro-integration.ts';

describe('imagePipeline', () => {
	test.each(['/', '//', ''])('refuses %j as a base URL', (baseUrl) => {
		expect(() =>
			imagePipeline({
				baseUrl,
				cachePath: 'cache',
				mediaPath: 'media',
				quality: { jpg: 85, webp: 70 },
			}),
		).toThrow('below the site root');
	});
});
