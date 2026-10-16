import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';

import { getMapDirectoryData, getMapPayloadUrl } from '#lib/map/map-directory.ts';

export const getStaticPaths = (async () => {
	const {
		datasets: { shared },
		payloads,
	} = await getMapDirectoryData();

	const manifestUrls = [...shared.payloads.keys()].map((id) =>
		getMapPayloadUrl(id, shared.version),
	);

	return [
		...[...payloads].map(([id, body]) => ({ params: { id }, props: { body } })),
		{ params: { id: 'map-manifest' }, props: { body: JSON.stringify(manifestUrls) } },
	];
}) satisfies GetStaticPaths;

export const GET = (({ props: { body } }) => {
	return new Response(body, { headers: { 'Content-Type': 'application/json' } });
}) satisfies APIRoute<InferGetStaticPropsType<typeof getStaticPaths>>;
