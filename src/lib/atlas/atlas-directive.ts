import type { ClientDirective } from 'astro';

// Hydrates once `<html data-atlas>` appears
// This was MapLibre doesn't load for visitors who never enable atlas mode
const atlasDirective: ClientDirective = (load, options, element) => {
	const root = document.documentElement;

	function loadStylesheet() {
		return new Promise<void>((resolve) => {
			const link = document.createElement('link');

			link.rel = 'stylesheet';
			link.href = options.value;
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

	if (Object.hasOwn(root.dataset, 'atlas')) {
		void hydrate();
		return;
	}

	const observer = new MutationObserver(() => {
		if (!Object.hasOwn(root.dataset, 'atlas')) return;

		observer.disconnect();
		void hydrate();
	});

	observer.observe(root, { attributeFilter: ['data-atlas'], attributes: true });
};

export default atlasDirective;
