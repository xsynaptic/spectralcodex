import type { LocationStatus, LocationStatusMetadata } from '@spectralcodex/map-types';

import { LocationStatusEnum } from '@spectralcodex/map-types';

export const LocationStatusRecords = {
	[LocationStatusEnum.Operational]: {
		title: 'Operational',
		titleAlt: '經營中',
		description: 'Still in business, typically for something close to its original purpose.',
	},
	[LocationStatusEnum.Public]: {
		title: 'Public',
		titleAlt: '公有',
		description:
			'Open to the public as an attraction of some kind, or otherwise appreciable from the surrounding area.',
	},
	[LocationStatusEnum.Restored]: {
		title: 'Restored',
		titleAlt: '修復',
		description: 'This building or site has been restored.',
	},
	[LocationStatusEnum.Converted]: {
		title: 'Converted',
		titleAlt: '改建',
		description:
			'The structure is intact but it has been converted for some other use than originally intended.',
	},
	[LocationStatusEnum.Private]: {
		title: 'Private',
		titleAlt: '私有',
		description:
			'Private sites that are either still occupied, patrolled, or otherwise inaccessible.',
	},
	[LocationStatusEnum.Idle]: {
		title: 'Idle',
		titleAlt: '閒置',
		description:
			'Closed but not necessarily abandoned, or recognized for its heritage value but awaiting restoration.',
	},
	[LocationStatusEnum.Abandoned]: {
		title: 'Abandoned',
		titleAlt: '廢墟',
		description: 'Abandoned to the elements, with or without security to prevent entry.',
	},
	[LocationStatusEnum.Remnants]: {
		title: 'Remnants',
		titleAlt: '遺跡',
		description:
			'Mostly demolished or transformed beyond recognition but some traces remain, though they may be minor.',
	},
	[LocationStatusEnum.Demolished]: {
		title: 'Demolished',
		titleAlt: '被拆除',
		description: 'Completely demolished and vanished into the mists of time.',
	},
	[LocationStatusEnum.Unknown]: {
		title: 'Unknown',
		titleAlt: '不明',
		description: 'The status of this location is unknown.',
	},
} as const satisfies Record<LocationStatus, LocationStatusMetadata>;
