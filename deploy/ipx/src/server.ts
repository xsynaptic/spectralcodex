// @ts-nocheck -- this is meant to be built on the server
import 'dotenv/config';
import { createApp, createRouter, defineEventHandler, toNodeListener } from 'h3';
import { createIPX, createIPXH3Handler, ipxFSStorage } from 'ipx';
import { listen } from 'listhen';

// Server configuration from environment
const config = {
	port: Number(process.env.PORT) || 3000,
	mediaDir: process.env.IPX_FS_DIR || '/media',
	maxAge: Number(process.env.IPX_FS_MAX_AGE) || 31_536_000,
	isDev: process.env.NODE_ENV !== 'production',
} as const;

// Create IPX instance with filesystem storage
const ipx = createIPX({
	storage: ipxFSStorage({
		dir: config.mediaDir,
		maxAge: config.maxAge,
	}),
	sharpOptions: { jpegProgressive: true },
});

// Create h3 app with router
const app = createApp();
const router = createRouter();

// Health check endpoint
router.get(
	'/health',
	defineEventHandler(() => ({
		status: 'ok',
		timestamp: new Date().toISOString(),
		mediaDir: config.mediaDir,
		mode: config.isDev ? 'development' : 'production',
	})),
);

// Mount routes
app.use(router);
app.use(createIPXH3Handler(ipx));

// Start server
const listener = await listen(toNodeListener(app), {
	port: config.port,
	public: true,
	showURL: true,
});

console.log('IPX Image Server started');
console.log(`  Media: ${config.mediaDir}`);
console.log(`  Cache max-age: ${String(config.maxAge)}s`);
console.log(`  Health: ${listener.url}health`);
