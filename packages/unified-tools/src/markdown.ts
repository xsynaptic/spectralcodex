import type { RehypeWrapCjkOptions } from 'rehype-wrap-cjk';

import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import rehypeWrapCjk from 'rehype-wrap-cjk';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkSmartyPants from 'remark-smartypants';
import { unified } from 'unified';

export function transformMarkdown({
	input,
	wrapCjkOptions,
}: {
	input: string;
	wrapCjkOptions?: Partial<RehypeWrapCjkOptions>;
}): string {
	const processor = unified().use(remarkParse).use(remarkSmartyPants).use(remarkRehype);

	if (wrapCjkOptions) processor.use(rehypeWrapCjk, wrapCjkOptions);

	processor.use(rehypeSanitize).use(rehypeStringify);

	return processor.processSync(input).toString().trim();
}
