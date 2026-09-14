import type { MapPopupItem, MapSourceItem } from '@spectralcodex/map-codec';

import { mapCodecTables } from '@spectralcodex/map-codec';
import { hash } from 'ohash';

import { hashShortLength } from '#constants.ts';

// Chunk payloads must be part of the key: popup text changes without touching a directory row
export function hashMapDirectoryData(
	directory: Array<MapSourceItem>,
	chunks: Map<string, Array<MapPopupItem>>,
): string {
	return hash({ chunks: [...chunks], codec: mapCodecTables, directory }).slice(0, hashShortLength);
}
