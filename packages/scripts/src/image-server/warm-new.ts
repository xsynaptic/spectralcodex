#!/usr/bin/env tsx
/**
 * Warm only new images in the cache (from cache-manifest-new.json)
 * Faster alternative to full cache warming when only new images need warming
 */
import { parseArgs } from 'node:util';

import { warmCacheNew } from './warm.js';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'root-path': { type: 'string', default: process.cwd() },
		'nginx-url': { type: 'string', default: 'http://localhost:3100' },
		concurrency: { type: 'string', default: '2' },
		random: { type: 'boolean', default: false },
		'dry-run': { type: 'boolean', default: false },
	},
});

await warmCacheNew({
	rootPath: values['root-path'],
	nginxUrl: values['nginx-url'],
	concurrency: Number(values.concurrency),
	random: values.random,
	dryRun: values['dry-run'],
});
