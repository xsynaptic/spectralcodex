import type { CustomThemeConfig } from 'tailwindcss/types/config';

// Note: these are automatically prefixed with `bg-`
export const backgroundImage = {
	// Fade from the top
	'featured-a': `linear-gradient(
    180deg,
    rgba(38, 38, 38, 0.4),
    rgba(38, 38, 38, 0.377) 9.61%,
    rgba(38, 38, 38, 0.348) 18.52%,
    rgba(38, 38, 38, 0.315) 26.88%,
    rgba(38, 38, 38, 0.279) 34.81%,
    rgba(38, 38, 38, 0.24) 42.48%,
    rgba(38, 38, 38, 0.2) 50%,
    rgba(38, 38, 38, 0.16) 57.52%,
    rgba(38, 38, 38, 0.121) 65.19%,
    rgba(38, 38, 38, 0.085) 73.13%,
    rgba(38, 38, 38, 0.052) 81.48%,
    rgba(38, 38, 38, 0.023) 90.39%,
    rgba(38, 38, 38, 0)
  )`,
	// Fade from the bottom
	'featured-b': `linear-gradient(
    0deg,
    rgba(38, 38, 38, 0.6),
    rgba(38, 38, 38, 0.565) 9.61%,
    rgba(38, 38, 38, 0.522) 18.52%,
    rgba(38, 38, 38, 0.473) 26.88%,
    rgba(38, 38, 38, 0.418) 34.81%,
    rgba(38, 38, 38, 0.36) 42.48%,
    rgba(38, 38, 38, 0.3) 50%,
    rgba(38, 38, 38, 0.24) 57.52%,
    rgba(38, 38, 38, 0.182) 65.19%,
    rgba(38, 38, 38, 0.128) 73.13%,
    rgba(38, 38, 38, 0.078) 81.48%,
    rgba(38, 38, 38, 0.035) 90.39%,
    rgba(38, 38, 38, 0)
  )`,
	// A little texture for the header
	'header-fade': `linear-gradient(
    180deg,
    hsla(0, 0%, 96%, 0.9),
    hsla(0, 0%, 96%, 0.896) 22.97%,
    hsla(0, 0%, 96%, 0.885) 42.13%,
    hsla(0, 0%, 96%, 0.869) 57.81%,
    hsla(0, 0%, 96%, 0.848) 70.37%,
    hsla(0, 0%, 96%, 0.825) 80.15%,
    hsla(0, 0%, 96%, 0.8) 87.5%,
    hsla(0, 0%, 96%, 0.775) 92.77%,
    hsla(0, 0%, 96%, 0.752) 96.3%,
    hsla(0, 0%, 96%, 0.731) 98.44%,
    hsla(0, 0%, 96%, 0.715) 99.54%,
    hsla(0, 0%, 96%, 0.704) 99.94%,
    hsla(0, 0%, 96%, 0.7)
  )`,
	'header-fade-dark': `linear-gradient(
    180deg,
    hsla(0, 0%, 18%, 0.9),
    hsla(0, 0%, 18%, 0.896) 22.97%,
    hsla(0, 0%, 18%, 0.885) 42.13%,
    hsla(0, 0%, 18%, 0.869) 57.81%,
    hsla(0, 0%, 18%, 0.848) 70.37%,
    hsla(0, 0%, 18%, 0.825) 80.15%,
    hsla(0, 0%, 18%, 0.8) 87.5%,
    hsla(0, 0%, 18%, 0.775) 92.77%,
    hsla(0, 0%, 18%, 0.752) 96.3%,
    hsla(0, 0%, 18%, 0.731) 98.44%,
    hsla(0, 0%, 18%, 0.715) 99.54%,
    hsla(0, 0%, 18%, 0.704) 99.94%,
    hsla(0, 0%, 18%, 0.7)
  )`,
} satisfies Partial<CustomThemeConfig>;
