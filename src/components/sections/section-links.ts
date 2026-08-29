import type { ResourceLink } from '#lib/collections/resources/resources-utils.ts';

import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { getMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { getLinkPlatform } from '#lib/utils/link-platforms.ts';
import { getResourceUrl } from '#lib/utils/routing.ts';
import { formatStringTemplate } from '#lib/utils/text.ts';

export function buildResourceLink(link: ResourceLink) {
	const t = getTranslations();

	const platform = 'id' in link ? undefined : getLinkPlatform(link.url);

	return {
		url: link.url,
		title: platform
			? formatStringTemplate(t('section.links.platform.label'), {
					platform,
					title: link.title,
				})
			: link.title,
		titleMultilingual: getMultilingualContent({ data: link, prop: 'title' })?.primary,
		resourceUrl:
			'id' in link && 'showPage' in link ? getResourceUrl(link.id, link.showPage) : undefined,
	};
}
