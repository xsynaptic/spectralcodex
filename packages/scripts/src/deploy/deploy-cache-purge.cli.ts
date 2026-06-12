#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { findWorkspaceRoot } from '../shared/utils.js';
import { purgeCache } from './deploy-cache-purge.js';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'dry-run': { type: 'boolean', default: false },
	},
});

await purgeCache({
	rootPath: findWorkspaceRoot(),
	dryRun: values['dry-run'],
});
