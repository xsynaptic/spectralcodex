const excludedPrefixes = ['/objectives', '/taiwan-theater-project', '/chronology'];

export function getUrlPathIndexing(pathname: string) {
	const normalized = pathname.replace(/\/$/, '');

	if (
		excludedPrefixes.some((prefix) => normalized === prefix || normalized.startsWith(prefix + '/'))
	) {
		return { follow: false, index: false };
	}

	// Paginated routes repeat content already indexed at page one
	if (/\/\d+$/.test(normalized)) return { follow: true, index: false };

	return { follow: true, index: true };
}
