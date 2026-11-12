import type {
	OpenGraphCardInput,
	OpenGraphCardTemplate,
	openGraphTemplateVariants,
	OpenGraphVariant,
	ResolvedOpenGraphCardInput,
} from '@spectralcodex/shared/open-graph';
import type { ReactElement } from 'react';

import { resolveOpenGraphCardInput } from '@spectralcodex/shared/open-graph';

import type { TemplateContext } from '#og-image/generate.ts';

import { getAtlasElement } from '#og-image/templates/atlas.tsx';
import { getHomepageElement } from '#og-image/templates/homepage.tsx';
import { getStandardStoryElement } from '#og-image/templates/standard-story.tsx';
import { getStandardElement } from '#og-image/templates/standard.tsx';

type ElementBuilder<Template extends OpenGraphCardTemplate> = (
	input: Extract<ResolvedOpenGraphCardInput, { template: Template }>,
	context: TemplateContext,
) => Promise<ReactElement>;

const templateElements = {
	atlas: { landscape: getAtlasElement },
	homepage: { landscape: getHomepageElement },
	standard: { landscape: getStandardElement, story: getStandardStoryElement },
} satisfies {
	[Template in OpenGraphCardTemplate]: Record<
		(typeof openGraphTemplateVariants)[Template][number],
		ElementBuilder<Template>
	>;
};

function isBuilderVariant<Variant extends OpenGraphVariant>(
	builders: Record<Variant, unknown>,
	variant: OpenGraphVariant,
): variant is Variant {
	return Object.hasOwn(builders, variant);
}

function getElementBuilder<Variant extends OpenGraphVariant, Builder>(
	builders: Record<Variant, Builder>,
	{ template, variant }: { template: OpenGraphCardTemplate; variant: OpenGraphVariant },
): Builder {
	const message = `The ${template} template draws no ${variant} card`;

	if (!isBuilderVariant(builders, variant)) throw new Error(message);

	return builders[variant];
}

export function getOpenGraphElement({
	context,
	input,
	variant,
}: {
	context: TemplateContext;
	input: OpenGraphCardInput;
	variant: OpenGraphVariant;
}) {
	const resolved = resolveOpenGraphCardInput(input);
	const target = { template: resolved.template, variant };

	if (resolved.template === 'homepage') {
		return getElementBuilder(templateElements.homepage, target)(resolved, context);
	}

	if (resolved.template === 'atlas') {
		return getElementBuilder(templateElements.atlas, target)(resolved, context);
	}

	return getElementBuilder(templateElements.standard, target)(resolved, context);
}
