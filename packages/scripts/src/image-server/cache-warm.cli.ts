#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { findWorkspaceRoot } from '../shared/utils.js';
import { warmImageCache } from './cache-warm.js';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'nginx-url': { type: 'string', default: 'http://localhost:3100' },
		concurrency: { type: 'string', default: '2' },
		random: { type: 'boolean', default: false },
		'dry-run': { type: 'boolean', default: false },
	},
});

await warmImageCache({
	rootPath: findWorkspaceRoot(),
	nginxUrl: values['nginx-url'],
	concurrency: Number(values.concurrency),
	random: values.random,
	dryRun: values['dry-run'],
});
