# Spectral Codex

This repository contains the working Astro project used to generate the [Spectral Codex](https://spectralcodex.com) website.

## Usage

### Development

Run `pnpm astro dev` to start the development server.

### Deployment

If your deployment needs are simple you can use the built-in rsync-based deployment script. Provision the relevant variables in `.env` and setup SSH keys then `pnpm run deploy` and `pnpm run deploy-assets` after a build.

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

## Notes

### MDX Configuration

- `tsconfig` should also specify the remark plugin toolchain Astro uses (and the user may modify) to lint Markdown and MDX files
- ESLint should be used to lint and format MDX files; Prettier support for MDX is not comprehensive and errors will be introduced when using it as the MDX formatter

### Map Icons

Experimental: This site uses custom map icons. To regenerate icons run `pnpm export-map-icons`. This requires [spreet](https://github.com/flother/spreet) to be installed separately (and globally).

### Image Assets

Keep original image assets in the media folder (default: `./media`, but you can configure this). High-quality JPG or lossless PNG format images at 2400+ pixels on the long edge are recommended. Current standard is mostly based on 3,600 pixel JPGs saved at maximum quality in Lightroom. Be sure to include the `clean-build-images` command in your build pipeline to remove unreferenced originals from builds!

### Metadata Improvements

In cases where you'd like to find properties _not_ present in frontmatter, run this from the `content` folder (exchanging "rating:" for whatever you want to find):

```sh
find . -name "*.mdx" -print0 | xargs -0 grep -L "rating:" | sort
```

### Build Profiling

```sh
npx 0x -- node ./node_modules/astro/astro.js build
```

## License

This project is licensed under the [MIT License](./LICENSE). Feel free to use and adapt the code for your own projects.
