// `toggle` does not bubble, so one capturing listener on the document covers every panel
// Module scripts run once and the document outlives view transitions, so this never stacks
document.addEventListener(
	'toggle',
	({ target }) => {
		if (!(target instanceof HTMLDetailsElement) || !target.open) return;

		const image = target.dataset.metaImage;

		if (!image) return;

		window.umami?.track('image-metadata-open', { image });
	},
	{ capture: true },
);
