import { useContext } from 'react';

import { DarkModeContext } from '../dark-mode';

export function useDarkMode() {
	const context = useContext(DarkModeContext);

	if ((context as boolean | undefined) === undefined) {
		throw new Error('useDarkMode must be used within a DarkModeProvider');
	}
	return context;
}
