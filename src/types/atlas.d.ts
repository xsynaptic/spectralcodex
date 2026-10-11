// Registers the `client:atlas` directive added by src/lib/atlas/atlas-integration.ts; the value is `AtlasDirectiveOptions` as JSON
import 'astro';

declare module 'astro' {
	interface AstroClientDirectives {
		'client:atlas'?: string;
	}
}
