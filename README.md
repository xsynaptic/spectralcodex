# Spectral Codex

This repository contains the working Astro project used to generate the [Spectral Codex](https://spectralcodex.com) website.

## Usage

Standard Astro commands apply; use `pnpm astro dev` to fire up the development server and `pnpm astro build` to generate a build. Deployment is handled by custom scripts invoked by `pnpm astro deploy` (but you'd need to modify this script for your own needs; it won't work out of the box).

## Project Structure

- `./astro`: automatically generated types and schemas
- `./dist`: output folder, automatically generated; delete this anytime
- `./packages/content-example`: example content for testing and demonstration purposes
- `./packages/image-loader`: an experimental image loader
- `./packages/image-open-graph`: an experimental OpenGraph image generator using Satori
- `./packages/image-service`: a slightly customized version of the default image service
- `./packages/react-map-component`: interactive map component used across this project
- `./packages/tailwind`: Tailwind CSS configuration files and a utility that returns a resolved configuration
- `./packages/unified`: bits and bobs from the unified ecosystem
- `./public`: contains a favicon and some fallback Open Graph images for general use
- `./public/fonts`: required for generating OpenGraph images using Satori; generated with a script
- `./public/icons`: icons for use with the map component; still a work in progress
- `./scripts`: various scripts for deployment, cleaning unused images out of builds, etc.
- `./src`: primary project source files
- `./temp`: temporary storage, delete anytime

## License

This project is licensed under the [MIT License](./LICENSE). Feel free to use and adapt the code (but not the personal content specific to the project) for your own projects.
