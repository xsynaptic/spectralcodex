import Keyv from 'keyv';

// A simple in-memory store for icons
const iconsCache = new Keyv({
	namespace: 'icons-cache',
});

iconsCache.on('error', (error: unknown) => {
	console.error('Connection Error:', error);
});

export { iconsCache };
