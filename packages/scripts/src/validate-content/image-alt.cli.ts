import { getCollectionEntries, withAstroContent, withSpinner } from '@xsynaptic/astro-scripts';

import { defineCommand, runCommand } from '#shared/command.ts';
import { validateImageAltTitles } from '#validate-content/image-alt.ts';
import { reportValidationResult } from '#validate-content/validation-result.ts';

// On demand only; untitled images are an authoring backlog, not a deployment gate
await runCommand(
	defineCommand({
		name: 'validate-image-alt',
		async run() {
			const imageEntries = await withSpinner('Loading content', () =>
				withAstroContent((content) => getCollectionEntries(content, ['images'])),
			);

			reportValidationResult(validateImageAltTitles(imageEntries));
		},
		summary: 'List images that have no title to use as alt text',
		title: 'Validate image alt',
	}),
);
