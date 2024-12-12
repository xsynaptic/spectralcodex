import { retext } from 'retext';
import retextSmartypants from 'retext-smartypants';

import type { Options as RetextSmartypantsOptions } from 'retext-smartypants';

export function stylizeText(string: string, options?: RetextSmartypantsOptions): string {
	const output = retext().use(retextSmartypants, options).processSync(string);

	return String(output);
}
