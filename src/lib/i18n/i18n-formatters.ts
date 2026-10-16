// Constructing an Intl formatter costs ~30µs, and pages call these thousands of times per build
function createFormatCache<Options, Format>(create: (locale: string, options: Options) => Format) {
	const cache = new Map<string, Format>();

	return function getFormat(locale: string, options: Options): Format {
		const key = `${locale}|${JSON.stringify(options)}`;
		const cached = cache.get(key);

		if (cached) return cached;

		const format = create(locale, options);

		cache.set(key, format);

		return format;
	};
}

export const getDateTimeFormat = createFormatCache(
	(locale, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, options),
);

export const getNumberFormat = createFormatCache(
	(locale, options: Intl.NumberFormatOptions | undefined) => new Intl.NumberFormat(locale, options),
);
