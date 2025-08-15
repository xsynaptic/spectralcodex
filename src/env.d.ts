type ModeType = 'auto' | 'dark' | 'light';

interface ModeManager {
	setMode: (mode: ModeType) => void;
	getMode: () => ModeType;
	getSystemMode: () => Extract<ModeType, 'light' | 'dark'>;
	getDefaultMode: () => ModeType;
	cleanup: () => void;
}

interface Window {
	mode: ModeManager | undefined;
}

// Astro.locals typing; must be namespaced "App" and in this file
declare namespace App {
	interface Locals {
		isRss: boolean;
	}
}
