import type { PropsWithChildren } from 'react';

import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';

// Serializable dark-mode adapter; a function couldn't survive Astro island-prop serialization
export interface MapDarkModeOptions {
	attributeName?: string | undefined;
	eventName?: string | undefined;
	darkValue?: string | undefined;
}

const DEFAULT_ATTRIBUTE_NAME = 'data-mode';
const DEFAULT_EVENT_NAME = 'mode-changed';
const DEFAULT_DARK_VALUE = 'dark';

const DarkModeContext = createContext(false);

function getServerSnapshot() {
	return false;
}

export function DarkModeProvider({
	darkMode,
	children,
}: PropsWithChildren<{ darkMode?: MapDarkModeOptions | undefined }>) {
	const attributeName = darkMode?.attributeName ?? DEFAULT_ATTRIBUTE_NAME;
	const eventName = darkMode?.eventName ?? DEFAULT_EVENT_NAME;
	const darkValue = darkMode?.darkValue ?? DEFAULT_DARK_VALUE;

	const subscribe = useCallback(
		(callback: () => void) => {
			document.addEventListener(eventName, callback);

			return () => {
				document.removeEventListener(eventName, callback);
			};
		},
		[eventName],
	);

	const getSnapshot = useCallback(
		() => document.documentElement.getAttribute(attributeName) === darkValue,
		[attributeName, darkValue],
	);

	const isDarkMode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

	return <DarkModeContext.Provider value={isDarkMode}>{children}</DarkModeContext.Provider>;
}

export function useDarkMode() {
	return useContext(DarkModeContext);
}
