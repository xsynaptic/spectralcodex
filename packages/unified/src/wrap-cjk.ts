import rehypeParse from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import rehypeWrapCjk from 'rehype-wrap-cjk';
import { unified } from 'unified';

import type { Plugin } from 'unified';

export function wrapCjk(string: string): string {
	const output = unified()
		.use(rehypeParse, { fragment: true })
		.use(rehypeWrapCjk as unknown as Plugin)
		.use(rehypeSanitize)
		.use(rehypeStringify)
		.processSync(string);

	return String(output);
}
