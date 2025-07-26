#!/usr/bin/env tsx
import { parseArgs } from 'node:util';
import { $ } from 'zx';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		packageName: {
			type: 'string',
			default: 'content',
		},
	},
});

if (!values.packageName) {
	console.error('Usage: pnpm run update-content-schemas <package>');
	process.exit(1);
}

/**
 * This simple script copies content collection schemas into the actual content package consumed by this project
 */
await $`cp .astro/collections/*.schema.json packages/${values.packageName}/schemas/`;
