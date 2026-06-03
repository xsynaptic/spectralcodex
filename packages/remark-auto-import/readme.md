# @spectralcodex/remark-auto-import

A remark plugin that injects component imports at the top of every Astro `.mdx` file, so components can be used in content without an explicit `import`.

Add it to the `unified()` markdown processor; MDX inherits the processor's remark plugins automatically, so no separate integration is needed.

Logic adapted from [`astro-auto-import`](https://github.com/delucis/astro-auto-import) reshaped as a remark plugin for Astro 6.

## Usage

```js
import { unified } from '@astrojs/markdown-remark';
import { remarkAutoImport } from '@spectralcodex/remark-auto-import';

export default defineConfig({
	markdown: {
		processor: unified({
			remarkPlugins: [
				remarkAutoImport({
					imports: [{ './src/components/mdx/img.astro': [['default', 'Img']] }],
				}),
			],
		}),
	},
});
```
