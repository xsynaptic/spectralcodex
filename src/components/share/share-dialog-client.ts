import { defineShareKit, shareKitActionEventName } from '@xsynaptic/share-kit';

document.addEventListener(shareKitActionEventName, ({ detail }) => {
	window.umami?.track('share-dialog', { ...detail });
});

defineShareKit();
