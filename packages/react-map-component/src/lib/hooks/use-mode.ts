/* eslint-disable unicorn/prefer-global-this */
import { useEffect, useState } from 'react';

/**
 * These types mirror the mode system types in the main Astro application.
 * They must be kept in sync with @/components/mode/mode-types
 */
type Mode = 'light' | 'dark' | 'auto';
type ModeResolved = Omit<Mode, 'auto'>;

interface ModeChangedEventDetail {
	mode: Mode;
	modeResolved: ModeResolved;
}

interface ModeChangedEvent extends CustomEvent {
	detail: ModeChangedEventDetail;
}

export function useMode() {
	const [isDarkMode, setDarkMode] = useState(() => {
		if (typeof window === 'undefined') return false;

		const modeResolved =
			window.mode?.getMode() === 'auto' ? window.mode.getSystemMode() : window.mode?.getMode();

		return modeResolved === 'dark';
	});

	useEffect(() => {
		function handleModeChange(event: ModeChangedEvent) {
			setDarkMode(event.detail.modeResolved === 'dark');
		}

		document.addEventListener('mode-changed', handleModeChange as EventListener);

		return () => {
			document.removeEventListener('mode-changed', handleModeChange as EventListener);
		};
	}, []);

	return isDarkMode;
}
