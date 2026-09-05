#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { ensureSshKeychain, findWorkspaceRoot } from '#shared/utils.ts';

import { deployInfra } from './deploy-infra.ts';

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
