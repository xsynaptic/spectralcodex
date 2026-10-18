import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';

import { getMapPayloadUrl, mapPayloadName } from '@spectralcodex/map-codec';

import { getMapDirectoryData } from '#lib/map/map-directory.ts';

export const getStaticPaths = (async () => {
	const {
		datasets: { shared },
		divisionUrlById,
		payloads,
	} = await getMapDirectoryData();

	const manifestUrls = [
		...[...shared.payloads.keys()].map((id) => getMapPayloadUrl(shared.payloadBase, id)),
		...divisionUrlById.values(),
	];

	return [
		...[...payloads].map(([id, body]) => ({ params: { id }, props: { body } })),
		{ params: { id: mapPayloadName.manifest }, props: { body: JSON.stringify(manifestUrls) } },
	];
}) satisfies GetStaticPaths;

export const GET = (({ props: { body } }) => {
	return new Response(body, { headers: { 'Content-Type': 'application/json' } });
}) satisfies APIRoute<InferGetStaticPropsType<typeof getStaticPaths>>;
