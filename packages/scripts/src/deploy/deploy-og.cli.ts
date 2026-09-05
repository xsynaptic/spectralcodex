#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { deployOg } from '#deploy/deploy-og.ts';
import { ensureSshKeychain, findWorkspaceRoot } from '#shared/utils.ts';

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
