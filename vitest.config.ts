/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
	// @ts-expect-error -- This isn't being added to ambient type declarations for some reason
	test: {
		globals: true, // Load describe, expect, etc.
	},
});
