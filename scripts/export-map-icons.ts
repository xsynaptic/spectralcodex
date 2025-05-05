import { lookupCollection } from '@iconify/json';
import { blankIconSet, exportToDirectory, IconSet } from '@iconify/tools';
import { getIcons, validateIconSet } from '@iconify/utils';
import { mapMarkerIcons } from '@spectralcodex/map-types';
import path from 'node:path';

/**
 * Populate a custom icon set with whatever we might use in maps
 * Note: this is not yet used for anything
 */
export async function exportMapIcons(iconRecord: Record<string, string>): Promise<void> {
	const mapIcons = blankIconSet('mapIcons');

	for (const [iconId, iconRequest] of Object.entries(iconRecord)) {
		const [iconCollectionId, iconName] = iconRequest.split(':');

		if (iconCollectionId && iconName) {
			const iconCollection = await lookupCollection(iconCollectionId);

			// Fetch the target icon from the collection
			const iconDataRaw = getIcons(iconCollection, [iconName], true);

			if (iconDataRaw?.not_found && iconDataRaw.not_found.length > 0) {
				throw new Error(`Icon not found: ${iconDataRaw.not_found.join(', ')}`);
			}

			const iconDataValidated = validateIconSet(iconDataRaw);
			const iconSetRequested = new IconSet(iconDataValidated);
			const iconResolved = iconSetRequested.resolve(iconName);

			if (iconResolved) {
				mapIcons.setIcon(iconId, iconResolved);
			} else {
				console.log(`Missing ${iconName} (${iconId})!`);
			}
		}
	}

	await exportToDirectory(mapIcons, {
		cleanup: true,
		log: true,
		target: path.join(process.cwd(), process.env.ICONS_TEMP_PATH ?? 'temp/icons'),
	});
}

await exportMapIcons(mapMarkerIcons);
