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
