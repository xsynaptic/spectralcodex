# @xsynaptic/unpic-imagor

An experimental [unpic](https://unpic.pics) provider for [imagor](https://github.com/cshum/imagor).

## Example

```ts
import { generate, sign } from '@xsynaptic/unpic-imagor';

const path = generate('photo.jpg', { width: 800, quality: 80, format: 'webp' });
const signature = sign(path, process.env.IMAGOR_SECRET);
const url = `${IMAGOR_ORIGIN}/${signature}/${path}`;
```
