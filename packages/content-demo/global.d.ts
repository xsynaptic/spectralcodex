declare global {
	/**
	 * Consumed by the MDX language server to provide type-hinting in VS Code
	 * @link https://github.com/mdx-js/mdx-analyzer
	 */
	interface MDXProvidedComponents {
		// Note: we can't import Astro components direct, nor would we really want to
		// Since we use custom remark transformers to include import statements
		// So here we manually type the components, but that's OK, there aren't too many of them
		Email: (props: { children: React.ReactNode }) => React.JSX.Element;
		Img: (props: {
			alt?: string;
			children?: React.ReactNode;
			layout?: 'wide' | 'full';
			showMetadata?: boolean;
			src: string;
		}) => React.JSX.Element;
		ImgGroup: (props: {
			children: React.ReactNode;
			columns?: number | string;
			display?: 'grid' | 'carousel';
			layout?: 'wide' | 'full';
		}) => React.JSX.Element;
		Hide: (props: { children: React.ReactNode; char?: string }) => React.JSX.Element;
		Link: (props: { children: React.JSX.Element | string; id: string }) => React.JSX.Element;
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
