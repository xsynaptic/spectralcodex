import { runCommand } from '#shared/command.ts';
import { generateSitemapLastmod } from '#sitemap-lastmod/index.ts';

await runCommand({
	name: 'sitemap-lastmod',
	async run({ paths, rootPath }) {
		await generateSitemapLastmod({ paths, rootPath });
	},
	summary: 'Record each content path’s last git commit date for the sitemap',
	title: 'Sitemap lastmod',
});
