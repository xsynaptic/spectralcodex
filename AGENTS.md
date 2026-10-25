# AGENTS.md

Spectral Codex is a long-form, photo-heavy digital garden: an Astro SSG monorepo (using pnpm workspaces) with React (stateful and complex) and standard web components (light interactivity) rendering mixed-script content (Latin, CJK, Vietnamese, Thai) via MDX. The root is the app (`src/`); `packages/*` hold content, shared utilities, the map island, build integrations, and scripts. Reuse from `src/lib` before adding utilities.

Project vocabulary (Entry, Location, Region, Theme, Chronology, Catalog, etc.) is defined in `.claude/glossary.md`. Read it before naming anything or writing user-facing copy.

Avoid adding anything to this file unless it is something important agents wouldn't already infer from the codebase.

## Commands

Scripts live in `package.json`. Only the ones with a catch are worth stating here:

- **`pnpm build`: run it sparingly.** It is slow under memory pressure; the maintainer builds manually.
- `pnpm check`: report-only quality gate. Mutates nothing, so run it freely.
- `pnpm fix`: the mutating twin of `pnpm check` (autofixes, then reports what it could not fix). Somewhat slow; run once after a chunk of work, not repeatedly.
- `pnpm render-images`: renders the images the last build published; `deploy-site` runs it, so run it by hand only when asked.

## Project conventions

- **Images are referenced by URL, never imported** (Vite/Rolldown runs out of memory on the large library); every URL comes from a preset in `packages/shared/src/images.ts`, `pnpm render-images` writes the files, and dev renders them on demand under `/_img`.
- **Build-time validation is load-bearing**: internal IDs (locations, regions, themes, series), geospatial placement, and Zod schemas are checked during the build, so a bad reference fails loudly rather than shipping.
- Scripts in `packages/scripts` run on Node's built-in type stripping, which can't handle JSX, and the type checker won't warn you. `og-image` needs JSX, so it alone loads through `node --import tsx`; the `tsx` CLI is avoided because it kills a long run on Ctrl-C before it can save.
- Dynamic route files must be lowercase: `[...id].astro`, not `[...ID].astro`.
- Do not import from the main Astro app (`src/`) into anything under `packages/**` (the Vite/Rolldown build breaks on it). Duplicate the needed types locally in the package and leave a comment naming the source. Keep the duplication minimal.
- Reach for remeda (`import * as R from 'remeda'`) where it improves types or readability: multi-step collection pipelines (`R.pipe`), multi-key `R.sortBy`, `R.isIncludedIn` to narrow to a literal union, typed object helpers (`R.keys`, `R.pickBy`, `R.omit`) over `as` casts on `Object.*`, and `R.funnel` for throttling outside React state. Native methods for single steps (`.filter`, `.toSorted`, `.at`). It tree-shakes, so client code may use it.
- We prefer conditional rendering without abusing logical operators: `{condition ? <Element /> : undefined}`, never `{condition && <Element />}`.
- Client storage keys (localStorage, sessionStorage, IndexedDB) take the `scx-` prefix in kebab-case and live in a constants file, never as a literal at the call site; a pre-paint inline script receives them through `define:vars`.
- A component file takes its directory as a name prefix (`navigation/navigation-header.astro`); a custom element name is chosen for readability instead (`navigation-site.ts` defines `<site-navigation>`), so the two need not match.

## Styling

- Tailwind v4 provides the base and should be used when prototyping anything new but we prefer to avoid the more arcane and convoluted syntax where possible. If an atomic class isn't already in the main CSS output consider writing vanilla CSS.
- Utilities inline by default; a rule in `src/styles/main/components/<component>.css` (registered in `main.css` under `layer(components)`) only when the selector or value cannot sit on the element: content not authored here (MDX, pagefind, maplibre), structural and state selectors, pseudo-elements carrying `content`, values with no theme step.
- A decoration applied like a utility typically becomes a `@utility` in `parts/utilities.css`.
- No `<style>` blocks (they bundle into the same file, sit outside the cascade layers, and stop at the component's own template); `main-stylesheet.astro` is the one `is:inline` exception (FOUC guard).
- A hook class carries only what the stylesheet targets and shares a descriptive prefix or short-form representing the target. Avoid Microformat prefixes (`p-`, `h-`, `u-`, `dt-`, `e-`).
- Colour in a stylesheet is `light-dark()`; a non-colour dark swap is `[data-mode='dark'] &`; a utility is `dark:` where dark mode is used.
- Stylesheets read tokens as `var(--…)`; `@apply` where it replaces a media query or composes a project `@utility`.
- `md:`, `lg:` and `xl:` measure the atlas pane, not the viewport (redefined in `main.css`), so content lays out the same in the split as on a regular page that wide; a stylesheet writes `@container pane (width >= …)` for those steps. `sm:` and `@media (width >= 40rem)` stay on the viewport, since the pane only differs from the viewport in the split, where it is at least 40rem wide.
- Stacking order is `--z-index-*` applied as `z-*` utilities or `var()`.
- Every `hover:` on a focusable element has its `focus-visible:` twin where relevant. A stylesheet `:hover` sits under `@media (hover: hover)`, as Tailwind's `hover:` does; its `:focus-visible` partner stays outside it.

## Map package

Read `packages/react-map-component/AGENTS.md` before editing the map package or `src/lib/atlas`.

## Content subrepo

`packages/content` is a separate repository with its own always-on rules covering MDX formatting, frontmatter schemas, and prose style. Read `packages/content/AGENTS.md` before writing or editing anything under that directory. For sustained content work, open `packages/content` as its own project so those rules load automatically.
