import { describe, expect, test } from 'vitest';

import type { NavigationItem } from '#components/navigation/navigation-types.ts';
import type { MultilingualContent } from '#lib/i18n/i18n-types.ts';

import {
	getNavigationItemTriggerType,
	isActiveNavigationItem,
	isCurrentNavigationItem,
	shouldShowNavigationItemMultilingual,
} from '#components/navigation/navigation-utils.ts';

const titleMultilingual: MultilingualContent = { lang: 'zh', value: '臺灣' };

describe('isCurrentNavigationItem', () => {
	const regions: NavigationItem = { title: 'Regions', url: '/regions/' };

	test('matches the pathname exactly', () => {
		expect(isCurrentNavigationItem(regions, '/regions/')).toBe(true);
	});

	test('an ancestor of the current page is not current', () => {
		expect(isCurrentNavigationItem(regions, '/regions/taiwan/')).toBe(false);
	});

	test('an item with no url is never current', () => {
		expect(isCurrentNavigationItem({ title: 'Browse' }, '/regions/')).toBe(false);
	});
});

describe('isActiveNavigationItem', () => {
	const tree: NavigationItem = {
		children: [
			{ title: 'Canada', url: '/regions/canada/' },
			{
				children: [{ title: 'Taipei', url: '/regions/taiwan/taipei/' }],
				title: 'Taiwan',
				url: '/regions/taiwan/',
			},
		],
		title: 'Regions',
		url: '/regions/',
	};

	test('an ancestor of the current page is active', () => {
		expect(isActiveNavigationItem(tree, '/regions/taiwan/taipei/')).toBe(true);
	});

	test('one active child is enough, even among quiet siblings', () => {
		const regions = tree.children![0]!;

		expect(isActiveNavigationItem(tree.children![1]!, '/regions/taiwan/taipei/')).toBe(true);
		expect(isActiveNavigationItem(regions, '/regions/taiwan/taipei/')).toBe(false);
	});

	test('a branch holding nothing current is not active', () => {
		expect(isActiveNavigationItem(tree, '/posts/')).toBe(false);
	});

	test('a childless item is active only when it is current', () => {
		const posts: NavigationItem = { title: 'Posts', url: '/posts/' };

		expect(isActiveNavigationItem(posts, '/posts/')).toBe(true);
		expect(isActiveNavigationItem(posts, '/regions/')).toBe(false);
	});
});

describe('getNavigationItemTriggerType', () => {
	test('a url makes an anchor, even alongside children', () => {
		expect(getNavigationItemTriggerType({ title: 'Regions', url: '/regions/' })).toBe('anchor');
		expect(
			getNavigationItemTriggerType({
				children: [{ title: 'Taiwan', url: '/regions/taiwan/' }],
				title: 'Regions',
				url: '/regions/',
			}),
		).toBe('anchor');
	});

	test('children without a url make a button', () => {
		expect(
			getNavigationItemTriggerType({
				children: [{ title: 'Taiwan', url: '/regions/taiwan/' }],
				title: 'Browse',
			}),
		).toBe('button');
	});

	test('neither a url nor children makes a plain span', () => {
		expect(getNavigationItemTriggerType({ title: 'Browse' })).toBe('span');
		expect(getNavigationItemTriggerType({ children: [], title: 'Browse' })).toBe('span');
	});
});

describe('shouldShowNavigationItemMultilingual', () => {
	test('nothing shows without a multilingual title', () => {
		expect(
			shouldShowNavigationItemMultilingual(
				{ ancestor: 'taiwan', collection: 'regions', title: 'Taipei' },
				2,
			),
		).toBe(false);
	});

	test('a region shows only below the top level of a multilingual ancestor', () => {
		const taipei: NavigationItem = {
			ancestor: 'taiwan',
			collection: 'regions',
			title: 'Taipei',
			titleMultilingual,
		};

		expect(shouldShowNavigationItemMultilingual(taipei, 2)).toBe(true);
		expect(shouldShowNavigationItemMultilingual(taipei, 1)).toBe(false);
	});

	test('a region under any other ancestor, or none, stays quiet', () => {
		expect(
			shouldShowNavigationItemMultilingual(
				{ ancestor: 'canada', collection: 'regions', title: 'Vancouver', titleMultilingual },
				2,
			),
		).toBe(false);
		expect(
			shouldShowNavigationItemMultilingual(
				{ collection: 'regions', title: 'Vancouver', titleMultilingual },
				2,
			),
		).toBe(false);
	});

	test('series and themes show at any depth', () => {
		expect(
			shouldShowNavigationItemMultilingual(
				{ collection: 'series', title: 'Suhua Highway', titleMultilingual },
				1,
			),
		).toBe(true);
		expect(
			shouldShowNavigationItemMultilingual(
				{ collection: 'themes', title: 'Taiwan Theaters', titleMultilingual },
				1,
			),
		).toBe(true);
	});

	test('any other collection stays quiet', () => {
		expect(
			shouldShowNavigationItemMultilingual(
				{ collection: 'posts', title: 'A post', titleMultilingual },
				2,
			),
		).toBe(false);
	});
});
