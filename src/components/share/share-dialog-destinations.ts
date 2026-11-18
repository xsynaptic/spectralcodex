import type { ShareKitDestinationIdOf } from '@xsynaptic/share-kit';

import {
	shareKitAnywhere,
	shareKitBluesky,
	shareKitFacebook,
	shareKitInstagram,
	shareKitInstagramStory,
	shareKitMastodon,
	shareKitReddit,
	shareKitThreads,
	shareKitX,
} from '@xsynaptic/share-kit';

export const shareDialogDestinations = [
	shareKitAnywhere,
	shareKitThreads,
	shareKitFacebook,
	shareKitInstagram,
	shareKitInstagramStory,
	shareKitReddit,
	shareKitBluesky,
	shareKitMastodon,
	shareKitX,
] as const;

export type ShareDialogDestination = ShareKitDestinationIdOf<typeof shareDialogDestinations>;
