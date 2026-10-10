// Registers the `client:atlas` directive added by src/lib/atlas/atlas-integration.ts
import 'astro';

declare module 'astro' {
	interface AstroClientDirectives {
		'client:atlas'?: string;
	}
}
