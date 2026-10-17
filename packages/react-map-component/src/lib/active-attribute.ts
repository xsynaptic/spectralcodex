import { mapActiveAttribute } from '#constants.ts';

export function getActiveAttribute(isActive: boolean) {
	return { [mapActiveAttribute]: isActive ? '' : undefined };
}
