#!/usr/bin/env tsx
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'root-path': {
			type: 'string',
			default: process.cwd(),
		},
		'content-path': {
			type: 'string',
			default: 'content',
		},
	},
});

if (!values['content-path']) {
	console.error('Usage: pnpm run content-schemas --content-path=<content-path>');
	process.exit(1);
}

/**
 * This simple script copies content collection schemas into the actual content package consumed by this project
 */
await $`cp ${path.join(values['root-path'], '.astro/collections')}/*.schema.json ${path.join(values['root-path'], values['content-path'], 'schemas')}`;
