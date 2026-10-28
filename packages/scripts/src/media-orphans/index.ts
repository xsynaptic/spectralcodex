import { fallbackImageIds } from '@spectralcodex/shared/open-graph-fallback';
import { listImageSources } from '@xsynaptic/astro-image-pipeline/node';
import {
	formatCount,
	getCollectionEntries,
	log,
	withAstroContent,
	withSpinner,
} from '@xsynaptic/astro-scripts';

import { runCommand } from '#shared/command.ts';
import { getEntryImageIds } from '#shared/image-references.ts';

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

await runCommand({
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
		const ignore = values.ignore ?? [];
		const mediaFiles = [...(await listImageSources(paths.mediaPath))].filter((file) =>
			ignore.every((prefix) => !file.startsWith(prefix)),
		);
		const referencedImages = collectReferencedImages(entries);

		const orphanedFiles = mediaFiles
			.filter((file) => !referencedImages.has(file))
			.toSorted((fileA, fileB) => fileA.localeCompare(fileB));

		for (const file of orphanedFiles) log.data(file);

		log.info(
			`${formatCount(orphanedFiles.length)} of ${formatCount(mediaFiles.length)} media files unreferenced`,
		);
	},
	summary: 'List media files no entry references, one path per line on stdout',
	title: 'Media orphans',
});
