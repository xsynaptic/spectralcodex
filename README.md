# Spectral Codex

This repository contains the working Astro project used to generate the [Spectral Codex](https://spectralcodex.com) website.

## Usage

Standard Astro commands apply; use `pnpm astro dev` to fire up the development server and `pnpm astro build` to generate a build. Deployment is handled by custom scripts invoked by `pnpm deploy-static` (but you'd need to modify this script for your own needs; it won't work out of the box).

## Project Structure

- `./astro`: automatically generated types and schemas
- `./dist`: output folder, automatically generated; delete this anytime
- `./packages/content-example`: example content for testing and demonstration purposes
- `./packages/image-loader`: an experimental image loader; this treats image files as actual content and optionally reads metadata and generates low-quality image placeholders (LQIPs)
- `./packages/image-open-graph`: an experimental OpenGraph image generator using Satori
- `./packages/local-image-server`: a simple Astro integration that will host local images so they can be consumed by the image pipeline as if they were remote images (thereby saving a ton of memory in the build phase)
- `./packages/react-map-component`: interactive map component used across this project
- `./public`: contains a favicon and some fallback Open Graph images for general use
- `./public/fonts`: required for generating OpenGraph images using Satori; copied here with a script
- `./public/icons`: icons for use with the map component; still a work in progress, not yet in use
- `./scripts`: various scripts for deployment, cleaning unused images out of builds, etc.
- `./src`: primary project source files
- `./src/components`: mostly Astro components
- `./src/layouts`: layouts for Astro routes
- `./src/lib`: pure TypeScript utility code
- `./src/lib/collections`: Content Layer API config and data handling
- `./src/pages`: Astro routes
- `./src/pages/api`: static API routes
- `./src/styles`: Tailwind V4 config and other CSS-related files
- `./temp`: temporary storage, delete anytime

## License

This project is licensed under the [MIT License](./LICENSE). Feel free to use and adapt the code (but not the personal content specific to the project) for your own projects.
