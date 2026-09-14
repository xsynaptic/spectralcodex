#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { deployOg } from '#deploy/deploy-og.ts';
import { ensureSshKeychain, findWorkspaceRoot } from '#shared/utils.ts';

const { positionals, values } = parseArgs({
	allowPositionals: true,
	args: process.argv.slice(2),
	options: {
		'dry-run': { default: false, type: 'boolean' },
	},
});

await ensureSshKeychain();

await deployOg({
	dryRun: values['dry-run'],
	ids: positionals,
	rootPath: findWorkspaceRoot(),
});
