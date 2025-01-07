export interface MenuItem {
	title: string;
	url: string;
	children?: Array<MenuItem>;
}
