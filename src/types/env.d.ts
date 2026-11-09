// Augment ImportMetaEnv with custom env vars injected via vite.define in the Astro config
// Astro's client.d.ts declares ImportMeta with ImportMetaEnv so we only need to extend the interface
interface ImportMetaEnv {
	readonly BUILD_VERSION: string | undefined;
}

interface Window {
	umami?: { track: (eventName: string, eventData?: Record<string, unknown>) => void };
}
