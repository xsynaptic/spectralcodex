declare global {
	// Read by the MDX language server for type-hinting in `.mdx` files
	// https://github.com/mdx-js/mdx-analyzer
	interface MDXProvidedComponents {
		// Remark transformers inject the component imports, so these are typed by hand
		Email: (props: { children: React.ReactNode }) => React.JSX.Element;
		Hide: (props: { char?: string; children: React.ReactNode }) => React.JSX.Element;
		Img: (props: {
			alt?: string;
			children?: React.ReactNode;
			layout?: 'full' | 'wide';
			showMetadata?: boolean;
			src: string;
		}) => React.JSX.Element;
		ImgGroup: (props: {
			children: React.ReactNode;
			columns?: number | string;
			display?: 'carousel' | 'grid';
			layout?: 'full' | 'wide';
		}) => React.JSX.Element;
		Link: (props: { children: React.JSX.Element | string; id: string }) => React.JSX.Element;
		LocationsTable: (props: { tableId: string }) => React.JSX.Element;
		Map: (props: {
			locations: Array<string>;
			showHidden?: boolean | undefined;
		}) => React.JSX.Element;
		More: (props: { children?: never }) => React.JSX.Element;
		Resource: (props: { children: React.JSX.Element | string; id: string }) => React.JSX.Element;
	}
}

// The MDX language server only picks up the declarations above from a module
export {};
