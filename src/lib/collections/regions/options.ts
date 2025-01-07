import { getTranslations } from '@/lib/utils/i18n';

export interface RegionsOption {
	mapBoundsBuffer?: number;
	mapBoundsBufferMax?: number;
	termsRelatedLimit?: number;
	termsChildrenLabel?: string;
	termsSiblingsLabel?: string;
}

export function getRegionsOptions(depth: number): RegionsOption {
	const t = getTranslations();

	switch (depth) {
		case 1: {
			return {
				mapBoundsBuffer: 30,
				mapBoundsBufferMax: 300,
				termsRelatedLimit: 30,
				termsChildrenLabel: t('collection.regions.depth.1.labelChildren'),
				termsSiblingsLabel: t('collection.regions.depth.1.labelSiblings'),
			};
		}
		case 2: {
			return {
				mapBoundsBuffer: 10,
				mapBoundsBufferMax: 150,
				termsRelatedLimit: 20,
				termsChildrenLabel: t('collection.regions.depth.2.labelChildren'),
				termsSiblingsLabel: t('collection.regions.depth.2.labelSiblings'),
			};
		}
		default: {
			return {
				mapBoundsBuffer: 5,
				mapBoundsBufferMax: 80,
				termsRelatedLimit: 15,
				termsChildrenLabel: t('collection.regions.depth.3.labelChildren'),
				termsSiblingsLabel: t('collection.regions.depth.3.labelSiblings'),
			};
		}
	}
}
