import type { ContentEntry } from '#shared/astro-content.ts';
import type { ValidationResult } from '#validate-content/validation-result.ts';

export function validateImageAltTitles(imageEntries: Array<ContentEntry>) {
	const issues = imageEntries
		.filter((imageEntry) => {
			const title = imageEntry.data.title;

			return typeof title !== 'string' || title.trim() === '';
		})
		.map((imageEntry) => ({ message: `${imageEntry.id}: empty EXIF title` }))
		.sort((issueA, issueB) => issueA.message.localeCompare(issueB.message));

	if (issues.length === 0) {
		return {
			status: 'pass',
			summary: `${imageEntries.length.toString()} images carry an EXIF title`,
			issues,
		} satisfies ValidationResult;
	}

	return {
		status: 'warn',
		summary: `Found ${issues.length.toString()} of ${imageEntries.length.toString()} image(s) with an empty EXIF title`,
		issues,
	} satisfies ValidationResult;
}
