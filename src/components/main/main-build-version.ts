import { buildVersionStorageKey, millisecondsPerDay } from '#constants.ts';

const versionSelector = 'meta[name="build-version"]';

const currentVersion = document.querySelector<HTMLMetaElement>(versionSelector)?.content;

function markReload(gapDays: number) {
	try {
		sessionStorage.setItem(buildVersionStorageKey, String(gapDays));
	} catch {
		// sessionStorage unavailable; the reload goes unreported
	}
}

function reportReload() {
	let gapDays: null | string;

	try {
		gapDays = sessionStorage.getItem(buildVersionStorageKey);
		sessionStorage.removeItem(buildVersionStorageKey);
	} catch {
		return;
	}

	if (gapDays === null) return;

	window.umami?.track('build-version-reload', { gapDays: Number(gapDays) });
}

// Cancelling here hands the navigation to the browser before the router pushes history or touches the page
document.addEventListener('astro:before-preparation', (event) => {
	const loadNext = event.loader;

	event.loader = async () => {
		await loadNext();

		if (!currentVersion || event.defaultPrevented) return;

		const nextVersion = event.newDocument.querySelector<HTMLMetaElement>(versionSelector)?.content;

		if (!nextVersion || nextVersion === currentVersion) return;

		markReload(Math.round((Number(nextVersion) - Number(currentVersion)) / millisecondsPerDay));
		// eslint-disable-next-line unicorn/no-late-event-control -- Astro reads `defaultPrevented` only after awaiting the loader
		event.preventDefault();
	};
});

// Reported from the reloaded page, since a beacon sent before the reload races the unload
window.addEventListener('load', reportReload, { once: true });
