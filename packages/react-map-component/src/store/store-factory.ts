import type { MapSourceItem } from '@spectralcodex/map-codec';

import { createStore } from 'zustand';

import type { MapFilter } from '#data/data-filter.ts';
import type { MapScopeState } from '#store/store-scope.ts';
import type { MapClickOutcome, MapHoverCluster, MapStoreView } from '#types.ts';

import { defaultMapFilter } from '#data/data-filter.ts';
import { reduceMapScope, resolveMapScope } from '#store/store-scope.ts';

export interface MapDataStore extends MapDataState {
	actions: {
		applyClick: (outcome: MapClickOutcome) => void;
		clearSelection: () => void;
		resolveScope: (items: ReadonlyArray<MapSourceItem>) => void;
		setCanvasLoading: (isCanvasLoading: boolean) => void;
		setFilter: (filter: Partial<MapFilter>) => void;
		setHoveredId: (hoveredId: string | undefined, hoveredCluster?: MapHoverCluster) => void;
		setOverlay: (overlay: MapOverlay, isOpen: boolean) => void;
		setPopupVisible: (isPopupVisible: boolean) => void;
		setScopeEnabled: (isScopeEnabled: boolean) => void;
		syncView: (page: MapStoreView, items: ReadonlyArray<MapSourceItem> | undefined) => void;
	};
}

export type MapOverlay = 'filter' | 'search';

interface MapDataState extends MapScopeState, MapStoreView {
	filter: MapFilter;
	hoveredCluster: MapHoverCluster | undefined;
	hoveredId: string | undefined;
	isCanvasLoading: boolean;
	isPopupVisible: boolean;
	overlay: MapOverlay | undefined;
	selectedId: string | undefined;
}

const emptyTargetIds: Array<string> = [];

export function selectTargetIds({ view }: MapStoreView) {
	return view.targetIds ?? emptyTargetIds;
}

export function selectConnectionSubjectId({
	selectedId,
	view,
}: Pick<MapDataState, 'selectedId' | 'view'>) {
	return view.targetIds?.[0] ?? selectedId;
}

export function isLabelledTarget(
	properties: Pick<MapSourceItem['properties'], 'id' | 'pointTitle'>,
	targetIds: ReadonlyArray<string>,
) {
	return properties.pointTitle !== undefined && targetIds.includes(properties.id);
}

export function selectScope({
	isScopeEnabled,
	scope,
}: Pick<MapDataState, 'isScopeEnabled' | 'scope'>) {
	return isScopeEnabled ? scope : undefined;
}

export function isScopePending({ pendingTargetIds }: Pick<MapDataState, 'pendingTargetIds'>) {
	return pendingTargetIds.length > 0;
}

const noOverlay = { isPopupVisible: true, overlay: undefined, selectedId: undefined } as const;

const noPage: MapStoreView = { view: {}, viewKey: undefined };

export function createMapStore(page = noPage) {
	const state: MapDataState = {
		filter: defaultMapFilter,
		hoveredCluster: undefined,
		hoveredId: undefined,
		isCanvasLoading: true,
		...noOverlay,
		...page,
		...reduceMapScope(
			{ isScopeEnabled: true, pendingTargetIds: [], scope: undefined },
			page,
			undefined,
		),
	};

	return createStore<MapDataStore>()((set, get) => ({
		...state,
		actions: {
			applyClick: (outcome) => {
				set({
					...noOverlay,
					...(outcome.kind === 'popup' ? { selectedId: outcome.pointId } : {}),
					...(outcome.kind === 'expand-cluster' || outcome.kind === 'none'
						? {}
						: { hoveredCluster: undefined, hoveredId: undefined }),
					...(outcome.kind === 'open' && outcome.isScopeRestored ? { isScopeEnabled: true } : {}),
				});
			},
			clearSelection: () => {
				set(noOverlay);
			},
			resolveScope: (items) => {
				const current = get();

				if (current.pendingTargetIds.length === 0) return;

				set(resolveMapScope(current, items));
			},
			setCanvasLoading: (isCanvasLoading) => {
				set({ isCanvasLoading });
			},
			setFilter: (filter) => {
				set({ filter: { ...get().filter, ...filter }, selectedId: undefined });
			},
			setHoveredId: (hoveredId, hoveredCluster) => {
				set({ hoveredCluster, hoveredId });
			},
			setOverlay: (overlay, isOpen) => {
				if (isOpen) {
					set({ ...noOverlay, overlay });
					return;
				}

				if (get().overlay === overlay) set({ overlay: undefined });
			},
			setPopupVisible: (isPopupVisible) => {
				set({ isPopupVisible });
			},
			setScopeEnabled: (isScopeEnabled) => {
				set({ isScopeEnabled });
			},
			syncView: (page, items) => {
				const current = get();

				if (page.viewKey === current.viewKey) return;

				set({ ...reduceMapScope(current, page, items), ...noOverlay, ...page });
			},
		},
	}));
}
