import { defaultLanguage, translations } from '#lib/data/translations.ts';

// Boilerplate code from: https://docs.astro.build/en/recipes/i18n/#translate-ui-strings
export function getLangFromUrl(url: URL) {
	const [, lang] = url.pathname.split('/');

	if (lang && lang in translations) return lang as keyof typeof translations;

	return defaultLanguage;
}

export function getTranslations(lang: keyof typeof translations = defaultLanguage) {
	return function t(key: keyof (typeof translations)[typeof defaultLanguage]) {
		return translations[lang][key];
	};
}
