import rehypeParse from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import rehypeWrapCjk, { type RehypeWrapCjkOptions } from 'rehype-wrap-cjk';
import { unified } from 'unified';

export function wrapChinese(input: string) {
	const processor = unified()
		.use(rehypeParse, { fragment: true })
		.use(rehypeWrapCjk, { langCode: 'zh' })
		.use(rehypeSanitize)
		.use(rehypeStringify);

	return processor.processSync(input).toString();
}

export function wrapJapanese(input: string) {
	const processor = unified()
		.use(rehypeParse, { fragment: true })
		.use(rehypeWrapCjk, { langCode: 'ja' })
		.use(rehypeSanitize)
		.use(rehypeStringify);

	return processor.processSync(input).toString();
}

export function wrapKorean(input: string) {
	const processor = unified()
		.use(rehypeParse, { fragment: true })
		.use(rehypeWrapCjk, { langCode: 'ko' })
		.use(rehypeSanitize)
		.use(rehypeStringify);

	return processor.processSync(input).toString();
}

export function wrapCjk({
	input,
	wrapCjkOptions,
}: {
	input: string;
	wrapCjkOptions?: Partial<RehypeWrapCjkOptions>;
}) {
	const processor = unified().use(rehypeParse, { fragment: true });

	if (wrapCjkOptions) processor.use(rehypeWrapCjk, wrapCjkOptions);

	processor.use(rehypeSanitize).use(rehypeStringify);

	return processor.processSync(input).toString();
}
