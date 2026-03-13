// Augment ImportMetaEnv with custom env vars injected via vite.define in astro.config.mjs
// Astro's client.d.ts declares ImportMeta with ImportMetaEnv so we only need to extend the interface
interface ImportMetaEnv {
	readonly BUILD_VERSION: string | undefined;
}

// Astro.locals typing; must be in a global ambient .d.ts file under the App namespace
declare namespace App {
	interface Locals {
		isFeed: boolean;
	}
}
