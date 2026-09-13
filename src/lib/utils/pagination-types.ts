export interface Pagination {
	counter?: string;
	label: string;
	next?: PaginationLink;
	options: Array<PaginationOption>;
	placeholder?: string;
	previous?: PaginationLink;
	selectLabel: string;
	selectSuffix?: string;
	submitLabel: string;
}

interface PaginationLink {
	ariaLabel?: string;
	label: string;
	url: string;
}

interface PaginationOption {
	isCurrent?: boolean;
	label: string;
	url: string;
}
