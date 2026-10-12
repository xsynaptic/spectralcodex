import type { ClientDirective } from 'astro';

import { isAtlasMapShown } from '#lib/atlas/atlas-layout-factory.ts';

// Serialized into the `client:atlas` value; a directive takes one string
export interface AtlasDirectiveOptions {
	css: string;
}

// Astro runs a directive again each time a persisted island reconnects, which is every swap
const startedIslands = new WeakSet<HTMLElement>();

// Keeps MapLibre from loading before the mode is on, or under a hidden shell
const atlasDirective: ClientDirective = (load, options, element) => {
	if (startedIslands.has(element)) return;

	startedIslands.add(element);

	const root = document.documentElement;
	const { css } = JSON.parse(options.value) as AtlasDirectiveOptions;

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
		const isShown = isAtlasMapShown({
			hasFlag: Object.hasOwn(root.dataset, 'atlas'),
			page: root.dataset.atlasPage,
		});

		if (!isShown) return;

		observer.disconnect();
		void hydrate();
	}

	observer.observe(root, { attributeFilter: ['data-atlas', 'data-atlas-page'], attributes: true });

	hydrateWhenVisible();
};

export default atlasDirective;
