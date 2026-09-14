#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { deployInfra } from '#deploy/deploy-infra.ts';
import { ensureSshKeychain, findWorkspaceRoot } from '#shared/utils.ts';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'dry-run': { default: false, type: 'boolean' },
	},
});

await ensureSshKeychain();

await deployInfra({
	dryRun: values['dry-run'],
	rootPath: findWorkspaceRoot(),
});
