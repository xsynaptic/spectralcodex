import postcssInlineSvg from 'postcss-inline-svg';

// Note: Astro's Tailwind integration includes Autoprefixer
export default {
	plugins: [postcssInlineSvg({ paths: ['./src/styles/svg'], removeFill: true })],
};
