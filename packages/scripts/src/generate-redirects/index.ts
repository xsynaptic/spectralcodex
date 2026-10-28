import {
	formatCount,
	getCollectionEntries,
	log,
	UserError,
	withAstroContent,
	withSpinner,
} from '@xsynaptic/astro-scripts';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { buildRedirectPairs } from '#generate-redirects/build-redirect-pairs.ts';
import { runCommand } from '#shared/command.ts';

await runCommand({
	name: 'generate-redirects',
	async run({ rootPath }) {
		const outputPath = path.join(rootPath, 'deploy/caddy/spectralcodex-redirects-generated.conf');

		const entries = await withSpinner('Loading content', () =>
			withAstroContent((content) =>
				getCollectionEntries(content, [
					'locations',
					'posts',
					'pages',
					'themes',
					'series',
					'regions',
					'resources',
				]),
			),
		);

		const { collisions, pairs: redirects, skipped } = buildRedirectPairs(entries);

		// Writing the file anyway would ship a rule that takes a live page off the site
		if (collisions.length > 0) {
			for (const collision of collisions) log.error(`Former id collision: ${collision}`);

			throw new UserError(`${String(collisions.length)} former id collision(s); nothing written`);
		}

		for (const note of skipped) log.warn(`Skipped ${note}`);

		if (redirects.length === 0) {
			log.warn('No formerIds found, writing empty redirect file');
			writeFileSync(outputPath, '# Auto-generated redirects (none found)\n');
			return;
		}

		const lines = ['# Auto-generated redirects from formerIds; do not edit manually', ''];

		for (const { fromPath, toPath } of redirects) {
			lines.push(`redir ${fromPath} ${toPath}{?query} 301`);
		}

		lines.push('');
		writeFileSync(outputPath, lines.join('\n'));
		log.success(`Generated ${formatCount(redirects.length)} redirects → ${outputPath}`);
	},
	summary: 'Write Caddy 301s from every entry’s formerIds',
	title: 'Generate redirects',
});
