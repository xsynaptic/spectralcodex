# @xsynaptic/unpic-imagor

An experimental [unpic](https://unpic.pics) provider for [imagor](https://github.com/cshum/imagor).

## Example

```ts
import { generate } from '@xsynaptic/unpic-imagor';

const path = generate('photo.jpg', { width: 800, quality: 80, format: 'webp' });
// => "800x0/filters:quality(80):format(webp)/photo.jpg"
```
