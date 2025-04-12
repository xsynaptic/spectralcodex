interface CollectionEntryWithHideSearch {
	data: {
		hideSearch?: boolean | undefined;
	};
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function getPagefindBodyProp<T extends CollectionEntryWithHideSearch>(entry: T) {
	if (entry.data.hideSearch) {
		return {};
	}
	return { 'data-pagefind-body': '' };
}
