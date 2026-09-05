#!/usr/bin/env tsx
import { parseArgs } from 'node:util';

import { ensureSshKeychain, findWorkspaceRoot } from '#shared/utils.ts';

import { deployMedia } from './deploy-media.ts';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'dry-run': { type: 'boolean', default: false },
		delete: { type: 'boolean', default: false },
	},
});

await ensureSshKeychain();

await deployMedia({
	rootPath: findWorkspaceRoot(),
	dryRun: values['dry-run'],
	withDelete: values.delete,
});
