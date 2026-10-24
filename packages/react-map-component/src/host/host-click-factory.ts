import type { MapClickOutcome } from '#types.ts';

export type MapClickHit =
	| { center: [number, number]; clusterId: number | string; kind: 'cluster' }
	| { isPick: boolean; kind: 'point'; pointId: string }
	| { kind: 'empty' }
	| { kind: 'link'; url: string };

export interface MapClickInput {
	canOpen: boolean;
	hit: MapClickHit;
	isPageHidden: boolean;
	pointUrl: string | undefined;
	scopeUrl: string | undefined;
	targetIds: ReadonlyArray<string>;
}

function getOpenOutcome(url: string, scopeUrl: string | undefined) {
	return { isScopeRestored: url === scopeUrl, kind: 'open', url } as const;
}

function getPointPage(
	{ canOpen, isPageHidden, pointUrl }: MapClickInput,
	{ isLoneTarget, isPick, isTarget }: { isLoneTarget: boolean; isPick: boolean; isTarget: boolean },
) {
	if (!canOpen || !pointUrl) return;
	if (isTarget && !isLoneTarget && !isPageHidden && !isPick) return;

	return pointUrl;
}

function resolvePointClick(
	input: MapClickInput,
	{ isPick, pointId }: { isPick: boolean; pointId: string },
): MapClickOutcome {
	const isTarget = input.targetIds.includes(pointId);
	const isLoneTarget = isTarget && input.targetIds.length === 1;
	const url = getPointPage(input, { isLoneTarget, isPick, isTarget });

	if (url) return getOpenOutcome(url, input.scopeUrl);
	if (isLoneTarget) return { kind: 'none' };

	return { isEased: isPick || !isTarget, kind: 'popup', pointId };
}

export function resolveClick(input: MapClickInput): MapClickOutcome {
	const { canOpen, hit, scopeUrl } = input;

	switch (hit.kind) {
		case 'cluster': {
			return { center: hit.center, clusterId: hit.clusterId, kind: 'expand-cluster' };
		}
		case 'empty': {
			return { kind: 'clear' };
		}
		case 'link': {
			return canOpen ? getOpenOutcome(hit.url, scopeUrl) : { kind: 'none' };
		}
		case 'point': {
			return resolvePointClick(input, hit);
		}
	}
}
