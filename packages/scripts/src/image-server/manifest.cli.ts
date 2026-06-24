#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { generateManifest } from './manifest.js';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'dist-path': { type: 'string', default: 'dist' },
		'output-path': { type: 'string', default: 'dist/cache-manifest.json' },
		'url-pattern': { type: 'string' },
		'main-path': { type: 'string' },
	},
});

const urlPattern = values['url-pattern'] ?? process.env.IMAGE_SERVER_URL;
if (!urlPattern) {
	console.error('Error: URL pattern required. Set IMAGE_SERVER_URL in .env or pass --url-pattern');
	process.exit(1);
}

generateManifest({
	distPath: values['dist-path'],
	outputPath: values['output-path'],
	urlPattern,
	...(values['main-path'] ? { mainPath: values['main-path'] } : {}),
});
