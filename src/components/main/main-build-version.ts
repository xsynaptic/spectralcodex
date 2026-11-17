import { buildVersionStorageKey, millisecondsPerHour } from '#constants.ts';
import { sendEvent } from '#lib/analytics/analytics-events.ts';

const versionSelector = 'meta[name="build-version"]';

const currentVersion = document.querySelector<HTMLMetaElement>(versionSelector)?.content;

// How long this tab ran old code after the newer build; a visitor's clock can run behind the build machine's
function getStaleHours(nextVersion: number) {
	return Math.max(0, Math.round((Date.now() - nextVersion) / millisecondsPerHour));
}

function markReload(staleHours: number) {
	try {
		sessionStorage.setItem(buildVersionStorageKey, String(staleHours));
	} catch {
		// sessionStorage unavailable; the reload goes unreported
	}
}

function reportReload() {
	let staleHours: null | string;

	try {
		staleHours = sessionStorage.getItem(buildVersionStorageKey);
		sessionStorage.removeItem(buildVersionStorageKey);
	} catch {
		return;
	}

	if (staleHours === null) return;

	sendEvent('build-version-reload', { staleHours: Number(staleHours) });
}

// Cancelling here hands the navigation to the browser before the router pushes history or touches the page
document.addEventListener('astro:before-preparation', (event) => {
	const loadNext = event.loader;

	event.loader = async () => {
		await loadNext();

		if (!currentVersion || event.defaultPrevented) return;

		const nextVersion = event.newDocument.querySelector<HTMLMetaElement>(versionSelector)?.content;

		if (!nextVersion || nextVersion === currentVersion) return;

		markReload(getStaleHours(Number(nextVersion)));
		// eslint-disable-next-line unicorn/no-late-event-control -- Astro reads `defaultPrevented` only after awaiting the loader
		event.preventDefault();
	};
});

// Reported from the reloaded page, since a beacon sent before the reload races the unload
window.addEventListener('load', reportReload, { once: true });
