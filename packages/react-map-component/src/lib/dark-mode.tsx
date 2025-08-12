/* eslint-disable unicorn/prefer-global-this */
import type { ReactNode } from 'react';

import { createContext, useEffect, useState } from 'react';

/**
 * These types mirror the mode system types in the main Astro application; they must be kept in sync
 */
type Mode = 'light' | 'dark' | 'auto';
type ModeResolved = Omit<Mode, 'auto'>;

interface ModeChangedEventDetail {
	mode: Mode;
	resolvedMode: ModeResolved;
}

interface ModeChangedEvent extends CustomEvent {
	detail: ModeChangedEventDetail;
}

export const DarkModeContext = createContext<boolean>(false);

export function DarkModeProvider({ children }: { children: ReactNode }) {
	const [isDarkMode, setDarkMode] = useState(() => {
		if (typeof window === 'undefined') return false;

		const modeResolved =
			window.mode?.getMode() === 'auto' ? window.mode.getSystemMode() : window.mode?.getMode();

		return modeResolved === 'dark';
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
