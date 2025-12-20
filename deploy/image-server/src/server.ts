import 'dotenv/config';
import { createServer } from 'node:http';
import { createIPX, createIPXNodeHandler, ipxFSStorage } from 'ipx';

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
});

// Create IPX request handler
const ipxHandler = createIPXNodeHandler(ipx);

// Create HTTP server with health check route
const server = createServer((req, res) => {
	// Health check endpoint
	if (req.url === '/health') {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(
			JSON.stringify({
				status: 'ok',
				timestamp: new Date().toISOString(),
				mediaDir: config.mediaDir,
				mode: config.isDev ? 'development' : 'production',
			}),
		);
		return;
	}

	// Delegate all other requests to IPX
	ipxHandler(req, res);
});

server.listen(config.port, () => {
	console.log('IPX Image Server started');
	console.log(`  URL: http://localhost:${String(config.port)}`);
	console.log(`  Media: ${config.mediaDir}`);
	console.log(`  Cache max-age: ${String(config.maxAge)}s`);
	console.log(`  Health: http://localhost:${String(config.port)}/health`);
});
