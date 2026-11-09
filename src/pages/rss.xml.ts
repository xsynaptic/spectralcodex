import type { APIRoute } from 'astro';

import { getRssResponse } from '@xsynaptic/astro-syndication/rss';

import {
	getSyndicationItems,
	getSyndicationPublication,
} from '#lib/syndication/syndication-data.ts';
import { getAbsoluteUrl, getBasePath } from '#lib/utils/routing.ts';

export const GET = (async (context) =>
	getRssResponse({
		items: await getSyndicationItems(),
		publication: getSyndicationPublication(context.site),
		selfUrl: getAbsoluteUrl(getBasePath('rss.xml')),
	})) satisfies APIRoute;
