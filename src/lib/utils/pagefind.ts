export function getPagefindBodyProp(hideSearch?: boolean) {
	if (hideSearch) {
		return {};
	}
	return { 'data-pagefind-body': '' };
}
