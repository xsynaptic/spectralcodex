import { defineShareKit, shareKitActionEventName } from '@xsynaptic/share-kit';

// Listen before defining the element, since a dialog opened by the `#share` hash fires its open event during `defineShareKit`
document.addEventListener(shareKitActionEventName, ({ detail }) => {
	window.umami?.track('share-dialog', { ...detail });
});

defineShareKit();
