import type { FC } from 'react';

import type { SearchComponentProps } from './types';

import { SearchContainer } from './search/search-container';

export const ReactSearchComponent: FC<SearchComponentProps> = function ReactSearchComponent(props) {
	return <SearchContainer {...props} />;
};
