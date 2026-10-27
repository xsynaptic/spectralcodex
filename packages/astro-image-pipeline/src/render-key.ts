import { createHash } from 'node:crypto';

export function hashRenderKey(parts: ReadonlyArray<number | string>) {
	return createHash('sha256').update(parts.join(':')).digest('hex').slice(0, 16);
}
