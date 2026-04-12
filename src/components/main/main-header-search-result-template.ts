/**
 * Custom Pagefind result template to extend the default with `srcset` for retina-ready thumbnails
 * @reference https://pagefind.app/docs/components/results/
 *
 * Lives in a separate .ts file so that the embedded `<script type="text/pagefind-template">`
 * string literal doesn't confuse knip's Astro parser (which counts raw `<script>` occurrences
 * when extracting script blocks from .astro files)
 */
/* eslint-disable no-useless-escape */
export const pagefindResultTemplate = `<script type="text/pagefind-template">
<li class="pf-result">
	<div class="pf-result-card">
		{{#if options.show_images}}
		<div class="pf-result-image">
			{{#if meta.image}}<img src="{{ meta.image | resolveUrl(meta.url | default(url)) }}" {{#if meta.image_2x}}srcset="{{ meta.image | resolveUrl(meta.url | default(url)) }} 1x, {{ meta.image_2x | resolveUrl(meta.url | default(url)) }} 2x"{{/if}} alt="{{ meta.image_alt | default(meta.title) }}">{{/if}}
		</div>
		{{/if}}
		<div class="pf-result-content">
			<p class="pf-result-title">
				<a class="pf-result-link" href="{{ meta.url | default(url) | safeUrl }}">{{ meta.title }}</a>
			</p>
			{{#if excerpt}}<p class="pf-result-excerpt">{{+ excerpt +}}</p>{{/if}}
		</div>
	</div>
	{{#if sub_results}}
	<ul class="pf-heading-chips">
		{{#each sub_results as sub}}
		<li class="pf-heading-chip">
			<a class="pf-heading-link" href="{{ sub.url | safeUrl }}">{{ sub.title }}</a>
			<p class="pf-heading-excerpt">{{+ sub.excerpt +}}</p>
		</li>
		{{/each}}
	</ul>
	{{/if}}
</li>
<\/script>`;
/* eslint-enable no-useless-escape */
