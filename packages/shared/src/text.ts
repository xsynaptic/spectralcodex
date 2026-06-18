// Strip combining diacritical marks for display font compatibility (e.g. "Shōka" → "Shoka")
// NFC recomposition restores precomposed characters (notably Hangul syllables) that NFD split apart.
export function stripDiacritics(input: string): string {
	return input
		.normalize('NFD')
		.replaceAll(/[\u{300}-\u{36F}]/gu, '')
		.normalize('NFC');
}
