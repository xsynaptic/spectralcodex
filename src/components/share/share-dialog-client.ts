import { defineShareKit, shareKitActionEventName } from '@xsynaptic/share-kit';

import { shareDialogDestinations } from '#components/share/share-dialog-destinations.ts';
import { sendEvent } from '#lib/analytics/analytics-events.ts';

document.addEventListener(shareKitActionEventName, ({ detail }) => {
	sendEvent('share-dialog', detail);
});

defineShareKit({
	destinations: shareDialogDestinations,
	icons: async () => {
		const { shareDialogIcons } = await import('#components/share/share-dialog-icons.ts');

		return shareDialogIcons;
	},
});
