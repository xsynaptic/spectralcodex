import type { ClientDirective } from 'astro';

import type { AtlasDirectiveOptions } from '#lib/atlas/atlas-directive-factory.ts';

import { shouldHydrateAtlas } from '#lib/atlas/atlas-directive-factory.ts';

// Astro runs a directive again each time a persisted island reconnects, which is every swap
const startedIslands = new WeakSet<HTMLElement>();

// Keeps MapLibre from loading before the mode is on, or under a hidden shell
const atlasDirective: ClientDirective = (load, options, element) => {
	if (startedIslands.has(element)) return;

	startedIslands.add(element);

	const root = document.documentElement;
	const { css, mediaQuery } = JSON.parse(options.value) as AtlasDirectiveOptions;
	const paneQuery = matchMedia(mediaQuery);

	function loadStylesheet() {
		return new Promise<void>((resolve) => {
			const link = document.createElement('link');

			link.rel = 'stylesheet';
			link.href = css;
			link.addEventListener('load', () => {
				resolve();
			});
			link.addEventListener('error', () => {
				resolve();
			});

			element.before(link);
		});
	}

	async function hydrate() {
		const [hydrateIsland] = await Promise.all([load(), loadStylesheet()]);

		await hydrateIsland();
	}

	const observer = new MutationObserver(hydrateWhenVisible);

	function hydrateWhenVisible() {
		const isVisible = shouldHydrateAtlas({
			hasFlag: Object.hasOwn(root.dataset, 'atlas'),
			isPaneMatch: paneQuery.matches,
			page: root.dataset.atlasPage,
		});

		if (!isVisible) return;

		observer.disconnect();
		paneQuery.removeEventListener('change', hydrateWhenVisible);
		void hydrate();
	}

	observer.observe(root, { attributeFilter: ['data-atlas', 'data-atlas-page'], attributes: true });
	paneQuery.addEventListener('change', hydrateWhenVisible);

	hydrateWhenVisible();
};

export default atlasDirective;
