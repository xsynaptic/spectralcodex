// Shared so the nav and the section it jumps to cannot disagree
export function getSectionId(title: string) {
	return title.toLowerCase().replaceAll(/\s+/g, '-');
}
