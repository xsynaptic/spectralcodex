import { defineMiddleware } from 'astro:middleware';

// `App.Locals` types `isFeed` as always present; the feed path sets it true via the Container API
export const onRequest = defineMiddleware((context, next) => {
	context.locals.isFeed = false;

	return next();
});
