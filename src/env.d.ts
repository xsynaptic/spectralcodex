// Not covered by astro:env but sometimes used in the application
interface ImportMetaEnv {
	readonly BUILD_ID: string;
	readonly BUILD_OUTPUT_PATH: string;
	readonly MAP_ICONS_PATH: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

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
