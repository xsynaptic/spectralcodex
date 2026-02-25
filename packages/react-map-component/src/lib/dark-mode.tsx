import type { PropsWithChildren } from 'react';

import { useContext } from 'react';
import { createContext, useEffect, useState } from 'react';

interface ModeChangedEventDetail {
	resolvedMode: 'light' | 'dark';
}

interface ModeChangedEvent extends CustomEvent {
	detail: ModeChangedEventDetail;
}

const DarkModeContext = createContext<boolean>(false);

export function DarkModeProvider({ children }: PropsWithChildren) {
	const [isDarkMode, setDarkMode] = useState(() => {
		if (typeof document === 'undefined') return false;
		return document.documentElement.dataset.mode === 'dark';
	});

	useEffect(() => {
		function handleModeChange(event: ModeChangedEvent) {
			setDarkMode(event.detail.resolvedMode === 'dark');
		}

		document.addEventListener('mode-changed', handleModeChange as EventListener);

		return () => {
			document.removeEventListener('mode-changed', handleModeChange as EventListener);
		};
	}, []);

	return <DarkModeContext.Provider value={isDarkMode}>{children}</DarkModeContext.Provider>;
}

export function useDarkMode() {
	return useContext(DarkModeContext);
}
