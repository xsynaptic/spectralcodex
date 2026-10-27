import path from 'node:path';

import type { OpenGraphCard, OpenGraphCardImage, OpenGraphCardInput } from '#open-graph-cards.ts';
import type { RenderJob, RenderJobOptions } from '#run-render-jobs.ts';
import type { SourceFingerprints } from '#source-fingerprints.ts';

import { engineId } from '#image-render.ts';
import { getImageCachePaths, readCurrentManifest } from '#image-state.ts';
import { hashRenderKey } from '#render-key.ts';
import { runRenderJobs } from '#run-render-jobs.ts';
import { createSourceFingerprints } from '#source-fingerprints.ts';

export interface OpenGraphCardSource extends OpenGraphCardImage {
	path: string;
}

export interface OpenGraphCardRenderOptions<Decoded> extends Pick<
	RenderJobOptions,
	'concurrency' | 'onFailure' | 'onProgress' | 'onReplace' | 'signal'
> {
	cachePath: string;
	decode: (source: OpenGraphCardSource) => Promise<Decoded>;
	render: (input: OpenGraphCardInput, decoded?: Decoded) => Promise<Uint8Array>;
	templateVersion: string;
}

interface OpenGraphCardGroup {
	cards: Array<[name: string, input: OpenGraphCardInput]>;
	image?: OpenGraphCardImage;
}

interface OpenGraphCardSourceState {
	digest?: string;
	source: OpenGraphCardSource;
}

function groupByImage(cards: Record<string, OpenGraphCard>) {
	const groups = new Map<string, OpenGraphCardGroup>();

	for (const [name, { image, input }] of Object.entries(cards)) {
		const groupKey = image ? JSON.stringify(image) : '';
		const group = groups.get(groupKey) ?? (image ? { cards: [], image } : { cards: [] });

		group.cards.push([name, input]);
		groups.set(groupKey, group);
	}

	return [...groups.values()];
}

async function readSourceState(
	fingerprints: SourceFingerprints,
	mediaPath: string,
	image: OpenGraphCardImage,
): Promise<OpenGraphCardSourceState> {
	const source = { ...image, path: path.resolve(mediaPath, image.id) };
	const fingerprint = await fingerprints.get(source.path);

	return fingerprint ? { digest: fingerprint.sha256, source } : { source };
}

function createGroupDecoder<Decoded>(decode: OpenGraphCardRenderOptions<Decoded>['decode']) {
	let current: undefined | { decoded: Promise<Decoded>; state: OpenGraphCardSourceState };

	return function getDecoded(state: OpenGraphCardSourceState) {
		if (current?.state !== state) {
			current = {
				decoded: state.digest
					? decode(state.source)
					: Promise.reject(new Error(`Missing image: ${state.source.id}`)),
				state,
			};
		}

		return current.decoded;
	};
}

async function createCardJobs<Decoded>({
	cachePath,
	decode,
	groups,
	mediaPath,
	render,
	templateVersion,
}: Pick<OpenGraphCardRenderOptions<Decoded>, 'decode' | 'render' | 'templateVersion'> & {
	cachePath: string;
	groups: ReadonlyArray<OpenGraphCardGroup>;
	mediaPath: string;
}) {
	const fingerprints = createSourceFingerprints(cachePath);
	const getDecoded = createGroupDecoder(decode);
	const jobs: Array<RenderJob> = [];

	for (const { cards, image } of groups) {
		const state = image ? await readSourceState(fingerprints, mediaPath, image) : undefined;

		for (const [name, input] of cards) {
			jobs.push({
				key: hashRenderKey([
					engineId,
					templateVersion,
					JSON.stringify(input),
					image ? JSON.stringify(image) : '',
					state?.digest ?? '',
				]),
				name,
				render: async () => render(input, state ? await getDecoded(state) : undefined),
			});
		}
	}

	return jobs;
}

export async function renderOpenGraphCards<Decoded>({
	cachePath,
	decode,
	render,
	templateVersion,
	...options
}: OpenGraphCardRenderOptions<Decoded>) {
	const resolvedCachePath = path.resolve(cachePath);
	const { openGraphCardsPath } = getImageCachePaths(resolvedCachePath);
	const manifest = await readCurrentManifest(resolvedCachePath);
	const groups = groupByImage(manifest.openGraphCards);
	const jobs = await createCardJobs({
		cachePath: resolvedCachePath,
		decode,
		groups,
		mediaPath: manifest.mediaPath,
		render,
		templateVersion,
	});
	const counts = await runRenderJobs({
		...options,
		directory: openGraphCardsPath,
		jobs,
	});

	return { ...counts, sources: groups.filter((group) => group.image).length };
}
