// `getViteConfig` scripts run Vite in serve mode, where Astro reads the store from `.astro`
// Pointing the cache here is what makes `astro sync` and `astro build` write the file those scripts read
export const astroCacheDir = './.astro';
