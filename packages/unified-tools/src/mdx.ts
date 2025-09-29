import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

export function sanitizeMdx(input: string): string {
	const processor = unified()
		.use(remarkParse)
		.use(remarkMdx)
		.use(remarkRehype)
		.use(rehypeSanitize, { tagNames: [] }) // Strip all tags
		.use(rehypeStringify)
		.processSync(input);

	return String(processor)
		.replaceAll(/\s+/g, ' ') // Normalize whitespace
		.trim();
}
