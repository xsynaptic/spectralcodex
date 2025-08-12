export function getPagefindBodyProp(hideSearch?: boolean) {
	return hideSearch ? {} : { 'data-pagefind-body': '' };
}
