#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { deployApp } from '#deploy/deploy-app.ts';
import { ensureSshKeychain, findWorkspaceRoot } from '#shared/utils.ts';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'dry-run': { default: false, type: 'boolean' },
		'skip-delete': { default: false, type: 'boolean' },
	},
});

await ensureSshKeychain();

await deployApp({
	dryRun: values['dry-run'],
	rootPath: findWorkspaceRoot(),
	skipDelete: values['skip-delete'],
});
