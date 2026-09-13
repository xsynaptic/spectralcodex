#!/usr/bin/env tsx
import { getCollectionEntries, withAstroContent } from '#shared/astro-content.ts';
import { validateImageAltTitles } from '#validate-content/image-alt.ts';
import { reportValidationResult } from '#validate-content/validation-result.ts';

// On demand only; untitled images are an authoring backlog, not a deployment gate
const imageEntries = await withAstroContent((content) => getCollectionEntries(content, ['images']));

reportValidationResult(validateImageAltTitles(imageEntries));
