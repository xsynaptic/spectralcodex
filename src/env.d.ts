interface ImportMetaEnv {
	readonly BUILD_ID: string;
	readonly BUILD_OUTPUT_PATH: string;
	readonly MAP_ICONS_PATH: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

// Astro.locals typing; must be namespaced "App" and in this file
declare namespace App {
	interface Locals {
		isRss: boolean;
	}
}
