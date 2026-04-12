import type { PropsWithChildren } from 'react';

import { createContext, useContext, useSyncExternalStore } from 'react';

const DarkModeContext = createContext(false);

function subscribe(callback: () => void) {
	document.addEventListener('mode-changed', callback);

	return () => {
		document.removeEventListener('mode-changed', callback);
	};
}

function getSnapshot() {
	return document.documentElement.dataset.mode === 'dark';
}

function getServerSnapshot() {
	return false;
}

export function DarkModeProvider({ children }: PropsWithChildren) {
	const isDarkMode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

	return <DarkModeContext.Provider value={isDarkMode}>{children}</DarkModeContext.Provider>;
}

export function useDarkMode() {
	return useContext(DarkModeContext);
}
