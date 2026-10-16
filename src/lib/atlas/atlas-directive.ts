import type { ClientDirective } from 'astro';

import { trackMap } from '@spectralcodex/react-map-component/track';

import { atlasFlagAttribute, atlasPageAttribute } from '#lib/atlas/atlas-constants.ts';
import { isAtlasMapShown, readAtlasFlags } from '#lib/atlas/atlas-layout-factory.ts';

export interface AtlasDirectiveOptions {
	css: string;
}

// Astro reruns a directive whenever a persisted island reconnects, which happens on every swap
const startedIslands = new WeakSet<HTMLElement>();

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
		try {
			const [hydrateIsland] = await Promise.all([load(), loadStylesheet()]);

			await hydrateIsland();
		} catch (error) {
			trackMap({ data: { kind: 'hydrate' }, name: 'map-error' });

			throw error;
		}
	}

	const observer = new MutationObserver(hydrateWhenVisible);

	function hydrateWhenVisible() {
		if (!isAtlasMapShown(readAtlasFlags(root))) return;

		observer.disconnect();
		void hydrate();
	}

	observer.observe(root, {
		attributeFilter: [atlasFlagAttribute, atlasPageAttribute],
		attributes: true,
	});

	hydrateWhenVisible();
};

export default atlasDirective;
