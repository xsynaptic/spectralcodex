// `getViteConfig` scripts run Vite in serve mode, where Astro reads the store from `.astro`
// Pointing the cache here is what makes `astro sync` and `astro build` write the file those scripts read
export const astroCacheDir = './.astro';

// Shared with the map package, which reads the site's mode too
export const modeAttribute = 'data-mode';
export const modeChangedEventName = 'mode-changed';
