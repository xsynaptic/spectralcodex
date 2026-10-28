import type { ContentEntry, ValidationResult } from '@xsynaptic/astro-scripts';

export function validateImageAltTitles(imageEntries: Array<ContentEntry>) {
	const issues = imageEntries
		.filter((imageEntry) => {
			const title = imageEntry.data.title;

			return typeof title !== 'string' || title.trim() === '';
		})
		.map((imageEntry) => ({ location: imageEntry.id, message: 'empty EXIF title' }))
		.toSorted((issueA, issueB) => issueA.location.localeCompare(issueB.location));

	if (issues.length === 0) {
		return {
			issues,
			status: 'pass',
			summary: `${imageEntries.length.toString()} images carry an EXIF title`,
		} satisfies ValidationResult;
	}

	return {
		issues,
		status: 'warn',
		summary: `Found ${issues.length.toString()} of ${imageEntries.length.toString()} image(s) with an empty EXIF title`,
	} satisfies ValidationResult;
}
