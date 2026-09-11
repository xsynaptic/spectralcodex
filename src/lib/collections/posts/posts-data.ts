import { createCollectionData, createCollectionLookupByIds } from '#lib/utils/collections.ts';

export const getPostsCollection = createCollectionData({ collection: 'posts', label: 'Posts' });

export const createPostsByIdsFunction = createCollectionLookupByIds('Posts', getPostsCollection);
