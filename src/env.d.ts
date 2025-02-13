// Not covered by astro:env but sometimes used in the application
interface ImportMetaEnv {
	readonly BUILD_ID: string;
	readonly BUILD_OUTPUT_PATH: string;
	readonly MAP_ICONS_PATH: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

type ThemeType = 'auto' | 'dark' | 'light';

interface ThemeManager {
	setTheme: (theme: ThemeType) => void;
	getTheme: () => ThemeType;
	getSystemTheme: () => Extract<ThemeType, 'light' | 'dark'>;
	getDefaultTheme: () => ThemeType;
	cleanup: () => void;
}

interface Window {
	theme: ThemeManager | undefined;
}

// Astro.locals typing; must be namespaced "App" and in this file
declare namespace App {
	interface Locals {
		isRss: boolean;
	}
}
