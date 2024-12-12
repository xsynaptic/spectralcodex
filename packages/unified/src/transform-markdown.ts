import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import rehypeWrapCjk from 'rehype-wrap-cjk';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkSmartyPants from 'remark-smartypants';
import { unified } from 'unified';

import type { Plugin } from 'unified';

export function transformMarkdown(string: string): string {
	const output = unified()
		.use(remarkParse)
		.use(remarkSmartyPants)
		.use(remarkRehype)
		.use(rehypeWrapCjk as unknown as Plugin)
		.use(rehypeSanitize)
		.use(rehypeStringify)
		.processSync(string);

	return String(output);
}
