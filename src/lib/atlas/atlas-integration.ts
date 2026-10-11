import type { AstroIntegration } from 'astro';

export default function atlas(): AstroIntegration {
	return {
		hooks: {
			'astro:config:setup': ({ addClientDirective }) => {
				addClientDirective({
					entrypoint: './src/lib/atlas/atlas-directive.ts',
					name: 'atlas',
				});
			},
		},
		name: 'atlas',
	};
}
