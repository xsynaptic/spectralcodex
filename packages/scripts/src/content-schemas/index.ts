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
		'output-path': {
			type: 'string',
			default: 'content',
		},
	},
});

if (!values['output-path']) {
	console.error('Usage: pnpm run content-schemas --output-path=<output-path>');
	process.exit(1);
}

/**
 * This simple script copies content collection schemas into the actual content package consumed by this project
 */
await $`cp ${path.join(values['root-path'], '.astro/collections')}/*.schema.json ${path.join(values['root-path'], values['output-path'], 'schemas')}`;
