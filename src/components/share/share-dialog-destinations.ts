import type { ShareKitDestinationIdOf } from '@xsynaptic/share-kit';

import {
	defineShareKitDestination,
	shareKitAnywhere,
	shareKitBluesky,
	shareKitCountLength,
	shareKitFacebook,
	shareKitInstagram,
	shareKitInstagramStory,
	shareKitLandscapeFormat,
	shareKitMastodon,
	shareKitMessages,
	shareKitPinterest,
	shareKitReddit,
	shareKitThreads,
	shareKitX,
} from '@xsynaptic/share-kit';

// LINE for PC ignores the `line.me/R` scheme, so a desktop gets the web share page instead
const line = defineShareKitDestination({
	actions: { desktop: ['open-composer'], mobile: ['open-composer'] },
	composer: ({ device, text, url }) =>
		device === 'mobile'
			? `https://line.me/R/share?text=${encodeURIComponent(text)}`
			: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
	count: shareKitCountLength,
	id: 'line',
	images: [shareKitLandscapeFormat],
	label: 'LINE',
	shape: 'full',
});

export const shareDialogDestinations = [
	shareKitAnywhere,
	shareKitThreads,
	shareKitFacebook,
	shareKitInstagram,
	shareKitInstagramStory,
	shareKitReddit,
	shareKitBluesky,
	shareKitMastodon,
	shareKitPinterest,
	shareKitX,
	line,
	shareKitMessages,
] as const;

export type ShareDialogDestination = ShareKitDestinationIdOf<typeof shareDialogDestinations>;
