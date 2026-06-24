#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { warmCache } from './deploy-cache-warm.js';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'base-url': { type: 'string' },
		concurrency: { type: 'string', default: '12' },
		limit: { type: 'string' },
		'dry-run': { type: 'boolean', default: false },
	},
});

await warmCache({
	...(values['base-url'] ? { baseUrl: values['base-url'] } : {}),
	concurrency: Number(values.concurrency),
	...(values.limit ? { limit: Number(values.limit) } : {}),
	dryRun: values['dry-run'],
});
