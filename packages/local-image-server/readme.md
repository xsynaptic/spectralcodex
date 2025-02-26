# Local Image Server

This is a simple Astro integration designed to serve local images in development mode and during builds. The purpose is to allow for local images to be consumed as if they were remote. It is designed for projects using Astro's built-in image optimization pipeline at scale (_e.g._ thousands of large images need to be processed). This is a workaround for Rollup importing local images into memory, which can cause issues when there are many images in a project (even if they're already cached).

## Configuration

Add the integration to your Astro config file and be sure to allow image optimization from `localhost`:

```ts
import { defineConfig } from 'astro/config';

export default defineConfig({
	integrations: [
		localImageServer({
			mediaPath: 'packages/content/media', // Relative to the project root
			mediaBaseUrl: '/media', // The base URL for the media path; this is added to avoid conflicts with other routes
			dev: process.env.NODE_ENV === 'development',
		}),
	],
	image: {
		remotePatterns: [
			{
				protocol: 'http',
				hostname: 'localhost',
			},
		],
	},
});
```

## License

MIT
