import base from '@xsynaptic/mdxlint-config';
import { remarkProseRules } from '@xsynaptic/remark-prose-rules';

const numberRange = {
	message: 'Use `--` (renders en-dash) for number ranges instead of a hyphen',
	pattern: String.raw`(\d)-(\d)`,
	replace: '$1--$2',
};

export default {
	...base,
	plugins: [...base.plugins, remarkProseRules({ patterns: [numberRange] })],
};
