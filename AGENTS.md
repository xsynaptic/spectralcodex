# AGENTS.md

Spectral Codex is a long-form, photo-heavy digital garden: an Astro SSG monorepo (using pnpm workspaces) with React (stateful and complex) and standard web components (light interactivity) rendering mixed-script content (Latin, CJK, Vietnamese, Thai) via MDX. The root is the app (`src/`); `packages/*` hold content, shared utilities, the map island, build integrations, and scripts. Reuse from `src/lib` before adding utilities.

Project vocabulary (Entry, Location, Region, Theme, Chronology, Catalog, etc.) is defined in `.claude/context.md`. Read it before naming anything or writing user-facing copy.

## Commands

Scripts live in `package.json`. Only the ones with a catch are worth stating here:

- **`pnpm build`: run it sparingly.** it can take 3+ minutes under memory pressure; the maintainer builds manually.
- `pnpm check`: report-only quality gate. Mutates nothing, so run it freely.
- `pnpm fix`: the mutating twin of `pnpm check` (autofixes, then reports what it could not fix). Somewhat slow; run once after a chunk of work, not repeatedly.
- `pnpm dev` boots a Docker image stack alongside the dev server.

## Project conventions

- **Images are referenced by URL, never imported** (Vite/Rolldown runs out of memory on the large library). They are URL-signed at build time and transformed on-demand by imagor behind nginx (stack in `deploy/docker-compose.yml`, also runs under `pnpm dev`). App-side wrapper: `src/lib/image/image-server.ts`. OG images use Sharp directly, not other image libraries.
- **Build-time validation is load-bearing**: internal IDs (locations, regions, themes, series), geospatial placement, and Zod schemas are checked during the build, so a bad reference fails loudly rather than shipping.
- **Collections have two read paths** (`src/lib/utils/collections.ts`): enriched wrappers from `createCollectionData` (stamp computed `_` fields onto `entry.data`), and `getRawCollection` for cross-collection assembly that must dodge circular init. Raw reads see pristine frontmatter only, never computed `_` fields. A lint rule forbids bare `getCollection` under `src/lib/collections/**`.
- Dynamic route files must be lowercase: `[...id].astro`, not `[...ID].astro`.
- Do not import from the main Astro app (`src/`) into anything under `packages/**` (the Vite/Rolldown build breaks on it). Duplicate the needed types locally in the package and leave a comment naming the source. Keep the duplication minimal.
- We prefer conditional rendering without abusing logical operators: `{condition ? <Element /> : undefined}`, never `{condition && <Element />}`.

## Styling

- Tailwind v4, CSS-first.
- Utilities inline by default; a rule in `src/styles/main/components/<component>.css` (registered in `main.css` under `layer(components)`) only when the selector or value cannot sit on the element: content not authored here (MDX, pagefind, maplibre), structural and state selectors, pseudo-elements carrying `content`, values with no theme step.
- A decoration applied like a utility typically becomes a `@utility` in `parts/utilities.css`.
- No `<style>` blocks (they bundle into the same file, sit outside the cascade layers, and stop at the component's own template); `main-stylesheet.astro` is the one `is:inline` exception (FOUC guard).
- A hook class carries only what the stylesheet targets and shares a descriptive prefix or short-form representing the target. Avoid Microformat prefixes (`p-`, `h-`, `u-`, `dt-`, `e-`).
- Colour in a stylesheet is `light-dark()`; a non-colour dark swap is `[data-mode='dark'] &`; a utility is `dark:` where dark mode is used.
- Stylesheets read tokens as `var(--…)`; `@apply` where it replaces a media query or composes a project `@utility`.
- Stacking order is `--z-index-*` applied as `z-*` utilities or `var()`.
- Every `hover:` on a focusable element has its `focus-visible:` twin where relevant.
- A stylesheet `:hover` sits under `@media (hover: hover)`, as Tailwind's `hover:` does; its `:focus-visible` partner stays outside it.

## Content subrepo

`packages/content` is a separate repository with its own always-on rules covering MDX formatting, frontmatter schemas, and prose style. Read `packages/content/AGENTS.md` before writing or editing anything under that directory. For sustained content work, open `packages/content` as its own project so those rules load automatically.
