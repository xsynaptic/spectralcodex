#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { ensureSshKeychain, findWorkspaceRoot } from '../shared/utils.js';
import { deployApp } from './deploy-app.js';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'dry-run': { type: 'boolean', default: false },
		'skip-delete': { type: 'boolean', default: false },
	},
});

await ensureSshKeychain();

await deployApp({
	rootPath: findWorkspaceRoot(),
	dryRun: values['dry-run'],
	skipDelete: values['skip-delete'],
});
