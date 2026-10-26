import { LocationStatusEnum } from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import type { MapScope } from '#types.ts';

import { makeMapSourceItem } from '#lib/map-test-utils.ts';
import { createMapStore } from '#store/store-factory.ts';

function popupOf(pointId: string) {
	return { isEased: false, kind: 'popup', pointId } as const;
}

describe('createMapStore', () => {
	test('a filter change drops the popup, whose Point may be filtered out', () => {
		const store = createMapStore();
		const { applyClick, setFilter } = store.getState().actions;

		applyClick(popupOf('location-1'));
		setFilter({ status: [LocationStatusEnum.Abandoned] });
		expect(store.getState().selectedId).toBeUndefined();

		applyClick(popupOf('location-2'));
		setFilter({ rating: 3 });
		expect(store.getState().selectedId).toBeUndefined();
		expect(store.getState().filter).toEqual({
			objective: 1,
			rating: 3,
			status: [LocationStatusEnum.Abandoned],
		});
	});

	test('one overlay at a time: the popup, the filter menu and search each close the others', () => {
		const store = createMapStore();
		const { applyClick, setOverlay } = store.getState().actions;
		const overlays = () => {
			const { overlay, selectedId } = store.getState();

			return { overlay, selectedId };
		};

		applyClick(popupOf('location-1'));
		setOverlay('search', true);
		expect(overlays()).toEqual({ overlay: 'search', selectedId: undefined });

		setOverlay('filter', true);
		expect(overlays()).toEqual({ overlay: 'filter', selectedId: undefined });

		applyClick(popupOf('location-2'));
		expect(overlays()).toEqual({ overlay: undefined, selectedId: 'location-2' });
	});

	test('closing one overlay leaves another that has since opened', () => {
		const store = createMapStore();
		const { setOverlay } = store.getState().actions;

		setOverlay('search', true);
		setOverlay('filter', false);
		expect(store.getState().overlay).toBe('search');
	});

	test('any click dismisses the open overlay before its outcome applies', () => {
		const store = createMapStore();
		const { applyClick, setOverlay } = store.getState().actions;

		setOverlay('filter', true);
		applyClick({ kind: 'clear' });
		expect(store.getState().overlay).toBeUndefined();

		setOverlay('search', true);
		applyClick({ center: [0, 0], clusterId: 1, kind: 'expand-cluster' });
		expect(store.getState().overlay).toBeUndefined();
	});

	test('opening a popup clears the hover label, but expanding a cluster keeps it', () => {
		const store = createMapStore();
		const { applyClick, setHoveredId } = store.getState().actions;

		setHoveredId('location-1');
		applyClick(popupOf('location-1'));
		expect(store.getState().hoveredId).toBeUndefined();

		setHoveredId('cluster-1');
		applyClick({ center: [0, 0], clusterId: 1, kind: 'expand-cluster' });
		expect(store.getState().hoveredId).toBe('cluster-1');
	});

	test('opening the held Scope page turns the Scope back on', () => {
		const store = createMapStore();
		const { applyClick, setScopeEnabled } = store.getState().actions;

		setScopeEnabled(false);
		applyClick({ isScopeRestored: false, kind: 'open', url: '/other/' });
		expect(store.getState().isScopeEnabled).toBe(false);

		applyClick({ isScopeRestored: true, kind: 'open', url: '/regions/tainan/' });
		expect(store.getState().isScopeEnabled).toBe(true);
	});

	test('closing the popup restores its visibility', () => {
		const store = createMapStore();
		const { applyClick, clearSelection, setPopupVisible } = store.getState().actions;

		applyClick(popupOf('location-1'));
		setPopupVisible(false);

		clearSelection();
		expect(store.getState()).toMatchObject({ isPopupVisible: true, selectedId: undefined });
	});
});

describe('syncView', () => {
	const region: MapScope = {
		rule: { interval: [10, 19], type: 'region' },
		title: 'Tainan',
		url: '/regions/tainan/',
	};
	const items = [makeMapSourceItem({ id: 'mine', regionOrdinals: [40], title: 'Mine' })];
	const regionPage = { view: { scope: region }, viewKey: 'region' };
	const minePage = { view: { targetIds: ['mine'] }, viewKey: 'mine' };

	test('a new view clears the selection and closes the filter panel', () => {
		const store = createMapStore(regionPage);
		const { applyClick, setOverlay, syncView } = store.getState().actions;

		applyClick(popupOf('location-1'));
		syncView(minePage, items);
		expect(store.getState()).toMatchObject({ selectedId: undefined, view: minePage.view });

		setOverlay('filter', true);
		syncView(regionPage, items);
		expect(store.getState().overlay).toBeUndefined();
	});

	test('the same view again leaves the selection, the filter panel and a Scope turned off alone', () => {
		const store = createMapStore(regionPage);
		const { applyClick, setOverlay, setScopeEnabled, syncView } = store.getState().actions;
		const { view } = store.getState();

		setScopeEnabled(false);
		applyClick(popupOf('location-1'));
		syncView({ ...regionPage, view: { scope: region } }, items);
		expect(store.getState()).toMatchObject({ isScopeEnabled: false, selectedId: 'location-1' });
		expect(store.getState().view).toBe(view);

		setOverlay('filter', true);
		syncView(regionPage, items);
		expect(store.getState().overlay).toBe('filter');
	});
});
