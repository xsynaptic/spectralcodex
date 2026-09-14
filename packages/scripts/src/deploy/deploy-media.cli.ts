#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { deployMedia } from '#deploy/deploy-media.ts';
import { ensureSshKeychain, findWorkspaceRoot } from '#shared/utils.ts';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		delete: { default: false, type: 'boolean' },
		'dry-run': { default: false, type: 'boolean' },
	},
});

await ensureSshKeychain();

await deployMedia({
	dryRun: values['dry-run'],
	rootPath: findWorkspaceRoot(),
	withDelete: values.delete,
});
