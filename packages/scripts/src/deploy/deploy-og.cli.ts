#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { ensureSshKeychain, findWorkspaceRoot } from '#shared/utils.ts';

import { deployOg } from './deploy-og.ts';

const { values, positionals } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'dry-run': { type: 'boolean', default: false },
	},
	allowPositionals: true,
});

await ensureSshKeychain();

await deployOg({
	rootPath: findWorkspaceRoot(),
	dryRun: values['dry-run'],
	ids: positionals,
});
