#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { ensureSshKeychain, findWorkspaceRoot } from '../shared/utils.js';
import { deployMedia } from './deploy-media.js';

const { values, positionals } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'dry-run': { type: 'boolean', default: false },
	},
	allowPositionals: true,
});

await ensureSshKeychain();

await deployMedia({
	rootPath: findWorkspaceRoot(),
	dryRun: values['dry-run'],
	fast: positionals[0] === 'fast',
});
