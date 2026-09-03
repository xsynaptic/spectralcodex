import type { AstroIntegration } from 'astro';

interface InventoryOptions {
	entrypoint?: string;
	route?: string;
}

export default function inventory({
	entrypoint = './src/inventory/inventory.astro',
	route = '/inventory',
}: InventoryOptions = {}): AstroIntegration {
	return {
		hooks: {
			'astro:config:setup': ({ command, injectRoute }) => {
				if (command !== 'dev') return;

				injectRoute({ entrypoint, pattern: route });
				injectRoute({
					entrypoint: './src/inventory/inventory-og-image.ts',
					pattern: `${route}/og/[key].jpg`,
				});
			},
		},
		name: 'inventory',
	};
}
