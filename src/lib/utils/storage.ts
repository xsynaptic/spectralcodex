type StorageName = 'localStorage' | 'sessionStorage';

export function readStorage(storage: StorageName, key: string) {
	try {
		return globalThis[storage].getItem(key) ?? undefined;
	} catch {
		return;
	}
}

export function writeStorage(storage: StorageName, key: string, value: string | undefined) {
	try {
		if (value === undefined) globalThis[storage].removeItem(key);
		else globalThis[storage].setItem(key, value);
	} catch {
		return;
	}
}
