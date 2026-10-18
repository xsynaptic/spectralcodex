import { LocationStatusEnum } from '@spectralcodex/shared/map';

export const MapPopupOwnField = {
	Description: 1,
	Image: 2,
	Precision: 8,
	Wikipedia: 4,
} as const;

export const LocationStatusNumericMapping = Object.fromEntries(
	Object.values(LocationStatusEnum).map((value, index) => [value, index]),
) as Record<(typeof LocationStatusEnum)[keyof typeof LocationStatusEnum], number>;
