// Ambient module declaration for @pagefind/default-ui, which ships no types
// This file lives in src/types/ so it's picked up by the root tsconfig's `include: ["**/*"]`
declare module '@pagefind/default-ui' {
	interface PagefindUIOptions extends Record<string, unknown> {
		element: string;
		bundlePath?: string | null;
	}

	// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- ambient declaration for untyped package
	class PagefindUI {
		constructor(options: PagefindUIOptions);
	}
}

declare module '@pagefind/default-ui/css/ui.css?url';
