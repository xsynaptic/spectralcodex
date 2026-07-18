/** @type {import('stylelint').Config} */
export default {
	extends: ['@xsynaptic/stylelint-config'],
	ignoreFiles: [
		'packages/react-map-component/styles/map-component.css',
		'src/styles/pagefind-component.css',
	],
	reportDescriptionlessDisables: true,
};
