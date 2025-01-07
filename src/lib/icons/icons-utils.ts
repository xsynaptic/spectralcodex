import { lookupCollection } from '@iconify/json';
import { getIcons, iconToSVG, parseIconSet, validateIconSet } from '@iconify/utils';
import { performance } from 'node:perf_hooks';
import * as R from 'remeda';

import type { StoredDataNoRaw } from 'keyv';

import { iconsCache } from '@/lib/icons/icons-cache';

// Parse icon requests to generate a map of unique icon sets and corresponding names
function getIconMap(iconRecord: Record<string, string>): Map<string, Array<string>> {
	const iconMap = new Map<string, Array<string>>();

	for (const iconRequest of R.values(iconRecord)) {
		const [iconCollectionId, iconName] = iconRequest.split(':');

		if (iconCollectionId && iconName) {
			const collection = iconMap.get(iconCollectionId);

			if (collection && !collection.includes(iconName)) {
				collection.push(iconName);
			} else {
				iconMap.set(iconCollectionId, [iconName]);
			}
		}
	}

	return iconMap;
}

// Generate an array of `symbol` elements for use in making sprite sheets from Iconify
export async function getSprites<T extends string>(
	key: string,
	iconRecord: Record<T, string>,
): Promise<Array<string>> {
	const startTime = performance.now();

	let sprites: StoredDataNoRaw<Array<string>> = await iconsCache.get<Array<string>>(key);

	if (!sprites) {
		const spritesMap = new Map<string, string>();

		const iconMap = getIconMap(iconRecord);

		// Iterate over all unique icon set keys and generate sprites
		for (const iconCollectionId of iconMap.keys()) {
			const iconCollection = await lookupCollection(iconCollectionId);

			const iconsRequested = getIcons(iconCollection, iconMap.get(iconCollectionId)!, true);

			if (iconsRequested?.not_found && iconsRequested.not_found.length > 0) {
				throw new Error(`Icons not found: ${iconsRequested.not_found.join(', ')}`);
			}

			parseIconSet(validateIconSet(iconsRequested), (iconId, iconData) => {
				if (!iconData) throw new Error(`Error parsing icon ${iconId}`);

				const id = `${iconCollectionId}:${iconId}`;

				// Only create one sprite per icon name
				if (spritesMap.get(id)) return;

				const renderData = iconToSVG(iconData, {
					height: 'auto',
				});

				const svgAttributes = {
					id,
					...renderData.attributes,
				};

				const svgAttributesString = R.pipe(
					R.keys(svgAttributes),
					R.map((attribute) => `${attribute}="${String(svgAttributes[attribute])}"`),
				).join(' ');

				spritesMap.set(id, `<symbol ${svgAttributesString}>${renderData.body}</symbol>`);
			});
		}

		sprites = [...spritesMap.values()];

		await iconsCache.set(key, sprites);

		console.log(
			`[Icons] Sprites generated in ${Number(performance.now() - startTime).toFixed(5)}ms`,
		);
	}

	return sprites;
}
