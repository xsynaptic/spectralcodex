declare global {
	/**
	 * Consumed by the MDX language server to provide type-hinting in VS Code
	 * @link https://github.com/mdx-js/mdx-analyzer
	 */
	interface MDXProvidedComponents {
		// Note: we can't import Astro components direct, nor would we really want to
		// Since we use custom remark transformers to include import statements
		// So here we manually type the components, but that's OK, there aren't too many of them
		Img: (props: {
			src: string;
			alt?: string;
			layout?: 'medium' | 'wide' | 'full';
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			children?: any;
		}) => React.JSX.Element;
		ImgGroup: (props: {
			layout?: 'wide';
			columns?: number | string;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			children: any;
		}) => React.JSX.Element;
		Hide: (props: {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			children: any;
			char?: string;
		}) => React.JSX.Element;
		Link: (props: { id?: string; children: string | React.JSX.Element }) => React.JSX.Element;
		LocationsTable: (props: { id: string }) => React.JSX.Element;
		Map: (props: {
			locations: Array<string>;
			showHidden?: boolean | undefined;
		}) => React.JSX.Element;
		More: (props: { children?: never }) => React.JSX.Element;
	}
}

// eslint-disable-next-line unicorn/require-module-specifiers -- this must be here for the previous declarations to be picked up by the MDX language server
export {};
