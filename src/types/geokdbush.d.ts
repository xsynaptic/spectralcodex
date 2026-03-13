// Ambient module declaration for geokdbush, which ships no types and has no @types package
// This file lives in src/types/ so it's picked up by the root tsconfig's `include: ["**/*"]`
declare module 'geokdbush' {
	import type KDBush from 'kdbush';

	export function around(
		index: KDBush,
		lng: number,
		lat: number,
		maxResults?: number,
		maxDistance?: number,
		predicate?: (id: number) => boolean,
	): Array<number>;

	export function distance(lng1: number, lat1: number, lng2: number, lat2: number): number;
}
