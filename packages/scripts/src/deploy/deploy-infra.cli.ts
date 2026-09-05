#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { deployInfra } from '#deploy/deploy-infra.ts';
import { ensureSshKeychain, findWorkspaceRoot } from '#shared/utils.ts';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'dry-run': { type: 'boolean', default: false },
	},
});

await ensureSshKeychain();

await deployInfra({
	rootPath: findWorkspaceRoot(),
	dryRun: values['dry-run'],
});
