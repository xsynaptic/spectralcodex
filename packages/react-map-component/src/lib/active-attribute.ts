import { mapActiveAttribute } from '#lib/constants.ts';

export function getActiveAttribute(isActive: boolean) {
	return { [mapActiveAttribute]: isActive ? '' : undefined };
}
