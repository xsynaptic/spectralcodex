import { log, UserError } from '@xsynaptic/astro-scripts';
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { defineCommand, runCommand } from '#shared/command.ts';

const schemaDir = '.astro/collections';

await runCommand(
	defineCommand({
		name: 'content-schemas',
		run({ paths }) {
			const sourcePath = path.resolve(paths.rootPath, schemaDir);
			const targetPath = path.join(path.dirname(paths.contentDataPath), 'schemas');

			const schemaFiles = readdirSync(sourcePath).filter((file) => file.endsWith('.schema.json'));

			if (schemaFiles.length === 0) {
				throw new UserError(`No schemas in ${schemaDir}; run \`astro sync\` first`);
			}

			mkdirSync(targetPath, { recursive: true });

			for (const file of schemaFiles) {
				copyFileSync(path.join(sourcePath, file), path.join(targetPath, file));
			}

			log.success(`${String(schemaFiles.length)} schemas → ${targetPath}`);
		},
		summary: 'Copy the collection JSON schemas `astro sync` writes into the content repository',
		title: 'Content schemas',
	}),
);
