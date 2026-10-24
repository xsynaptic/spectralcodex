import { defineCommand, Refusal, runCommand } from '#shared/cli-command.ts';
import { generateSitemapLastmod } from '#sitemap-lastmod/index.ts';

await runCommand(
	defineCommand({
		name: 'sitemap-lastmod',
		options: {
			'site-url': { description: 'Site origin; defaults to PROD_SERVER_URL', type: 'string' },
		},
		async run({ paths, values }) {
			const siteUrl = values['site-url'] ?? process.env.PROD_SERVER_URL;

			if (!siteUrl) throw new Refusal('Missing site URL: pass --site-url or set PROD_SERVER_URL');

			await generateSitemapLastmod({ paths, siteUrl });
		},
		summary: 'Record each content URL’s last git commit date for the sitemap',
		title: 'Sitemap lastmod',
	}),
);
