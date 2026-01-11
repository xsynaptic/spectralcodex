import type { IPXOperations as BaseIPXOperations } from 'unpic/providers/ipx';

/**
 * Extended IPX operations interface
 *
 * The upstream unpic IPX provider only exposes basic operations (w, h, s, q, f).
 * IPX itself supports many more modifiers which pass through at runtime.
 * This file extends the types to expose those additional operations.
 */
export interface IPXOperations extends BaseIPXOperations {
	fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
	position?: string;
	extract?: string;
	crop?: string;
	rotate?: number;
	flip?: boolean;
	flop?: boolean;
	blur?: number;
	sharpen?: number;
	grayscale?: boolean;
	background?: string;
}
