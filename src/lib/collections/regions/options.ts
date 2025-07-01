import { getTranslations } from '#lib/i18n/i18n-translations.ts';

export interface RegionsOption {
	termsRelatedLimit?: number;
	termsChildrenLabel?: string;
	termsSiblingsLabel?: string;
}

export function getRegionsOptions(depth: number): RegionsOption {
	const t = getTranslations();

	switch (depth) {
		// Top-level regions (*i.e.* countries)
		case 1: {
			return {
				termsRelatedLimit: 30,
				termsChildrenLabel: t('collection.regions.depth.1.labelChildren'),
				termsSiblingsLabel: t('collection.regions.depth.1.labelSiblings'),
			};
		}
		// Second-level regions (*e.g.* states, provinces)
		case 2: {
			return {
				termsRelatedLimit: 20,
				termsChildrenLabel: t('collection.regions.depth.2.labelChildren'),
				termsSiblingsLabel: t('collection.regions.depth.2.labelSiblings'),
			};
		}
		// Everything else (*e.g.* districts, cities, towns, etc.)
		default: {
			return {
				termsRelatedLimit: 15,
				termsChildrenLabel: t('collection.regions.depth.3.labelChildren'),
				termsSiblingsLabel: t('collection.regions.depth.3.labelSiblings'),
			};
		}
	}
}
