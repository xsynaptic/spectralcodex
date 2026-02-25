interface ImportMetaEnv {
	readonly BUILD_VERSION: string | undefined;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

// Astro.locals typing; must be namespaced "App" and in this file
declare namespace App {
	interface Locals {
		isFeed: boolean;
	}
}
