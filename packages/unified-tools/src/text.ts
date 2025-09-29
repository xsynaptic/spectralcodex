import type { Options as RetextSmartypantsOptions } from 'retext-smartypants';

import { retext } from 'retext';
import retextSmartypants from 'retext-smartypants';

export function stylizeText(input: string, options?: RetextSmartypantsOptions): string {
	const processor = retext().use(retextSmartypants, options).processSync(input);

	return String(processor).trim();
}
