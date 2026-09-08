import type { AstroIntegration } from 'astro';

interface InventoryOptions {
	entrypoint?: string;
	route?: string;
}

export default function devInventory({
	entrypoint = './src/dev/inventory/inventory.astro',
	route = '/inventory',
}: InventoryOptions = {}): AstroIntegration {
	return {
		hooks: {
			'astro:config:setup': ({ command, injectRoute }) => {
				if (command !== 'dev') return;

				injectRoute({ entrypoint, pattern: route });
				injectRoute({
					entrypoint: './src/dev/inventory/inventory-og-image.ts',
					pattern: `${route}/og/[key].jpg`,
				});
			},
		},
		name: 'dev-inventory',
	};
}
