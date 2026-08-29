import type { PropsWithChildren } from 'react';

import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';

// Serializable dark-mode adapter; a function couldn't survive Astro island-prop serialization
export interface MapDarkModeOptions {
	attributeName?: string | undefined;
	eventName?: string | undefined;
	darkValue?: string | undefined;
}

const defaultAttributeName = 'data-mode';
const defaultEventName = 'mode-changed';
const defaultDarkValue = 'dark';

const DarkModeContext = createContext(false);

// eslint-disable-next-line unicorn/consistent-boolean-name -- named for its useSyncExternalStore slot, not for what it returns
function getServerSnapshot() {
	return false;
}

export function DarkModeProvider({
	darkMode,
	children,
}: PropsWithChildren<{ darkMode?: MapDarkModeOptions | undefined }>) {
	const attributeName = darkMode?.attributeName ?? defaultAttributeName;
	const eventName = darkMode?.eventName ?? defaultEventName;
	const darkValue = darkMode?.darkValue ?? defaultDarkValue;

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

export function useIsDarkMode() {
	return useContext(DarkModeContext);
}
