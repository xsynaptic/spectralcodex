import { fallbackImageIds } from '@spectralcodex/shared/open-graph-fallback';

import { getCollectionEntries, withAstroContent } from '#shared/astro-content.ts';
import { defineCommand, runCommand } from '#shared/cli-command.ts';
import { formatCount, log } from '#shared/cli-output.ts';
import { withSpinner } from '#shared/cli-progress.ts';
import { getEntryImageIds, listMediaImages } from '#shared/image-references.ts';

// OG image fallbacks are referenced indirectly; seed them so they aren't flagged
function collectReferencedImages(entries: Awaited<ReturnType<typeof loadEntries>>) {
	return new Set([
		...entries.flatMap((entry) => {
			const { body, featured } = getEntryImageIds(entry);

			return [...featured, ...body];
		}),
		...Object.values(fallbackImageIds).flat(),
	]);
}

function loadEntries() {
	return withAstroContent((content) =>
		getCollectionEntries(content, [
			'chronology',
			'locations',
			'pages',
			'posts',
			'regions',
			'resources',
			'series',
			'themes',
		]),
	);
}

await runCommand(
	defineCommand({
		name: 'media-orphans',
		options: {
			ignore: {
				description: 'Skip media paths starting with this prefix; repeatable',
				multiple: true,
				type: 'string',
			},
		},
		async run({ paths, values }) {
			const entries = await withSpinner('Loading content', loadEntries);
			const mediaFiles = listMediaImages(paths.mediaPath, { ignore: values.ignore ?? [] });
			const referencedImages = collectReferencedImages(entries);

			const orphanedFiles = [...mediaFiles]
				.filter((file) => !referencedImages.has(file))
				.toSorted((fileA, fileB) => fileA.localeCompare(fileB));

			for (const file of orphanedFiles) log.data(file);

			log.info(
				`${formatCount(orphanedFiles.length)} of ${formatCount(mediaFiles.size)} media files unreferenced`,
			);
		},
		summary: 'List media files no entry references, one path per line on stdout',
		title: 'Media orphans',
	}),
);
