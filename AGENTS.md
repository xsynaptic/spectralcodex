# AGENTS.md

Spectral Codex is a long-form, photo-heavy digital garden: an Astro SSG monorepo (pnpm workspaces) with React and native-web-component islands for maps and search, rendering mixed-script content (Latin, CJK, Vietnamese, Thai). The root is the app (`src/`); `packages/*` hold content, shared utilities, the map island, build integrations, and scripts. Reuse from `src/lib` before adding utilities.

## Commands

Scripts live in `package.json`. Only the ones with a catch are worth stating here:

- **`pnpm build`: run it sparingly.** it can take 3+ minutes under memory pressure; the maintainer builds manually.
- `pnpm check`: report-only quality gate (stylelint, prettier, eslint, types, `astro check`, knip). Mutates nothing.
- `pnpm fix`: the mutating twin of `pnpm check` (autofixes, then reports what it could not fix). Slow; run once after a chunk of work, not repeatedly.
- `pnpm dev` boots a Docker image stack alongside the dev server.

## Project conventions

- **Images are referenced by URL, never imported** (Vite/Rollup runs out of memory on the large library). They are URL-signed at build time and transformed on-demand by imagor behind nginx (stack in `deploy/docker-compose.yml`, also runs under `pnpm dev`). App-side wrapper: `src/lib/image/image-server.ts`. OG images use Sharp directly, not other image libraries.
- **Build-time validation is load-bearing**: internal IDs (locations, regions, themes, series), geospatial placement, and Zod schemas are checked during the build, so a bad reference fails loudly rather than shipping.
- **Collections have two read paths** (`src/lib/utils/collections.ts`): enriched wrappers from `createCollectionData` (stamp computed `_` fields onto `entry.data`), and `getRawCollection` for cross-collection assembly that must dodge circular init. Raw reads see pristine frontmatter only, never computed `_` fields. A lint rule forbids bare `getCollection` under `src/lib/collections/**`.
- Dynamic route files must be lowercase: `[...id].astro`, not `[...ID].astro`.
- Global styles live in `src/styles/main.css`; layout components compute CSS classes from props. Prefer those over scoped `.astro` styles.
- Do not import from the main Astro app (`src/`) into anything under `packages/**`. The Vite/Rollup build breaks on it. Duplicate the needed types locally in the package and leave a comment naming the source. Keep the duplication minimal.
- We prefer conditional rendering without abusing logical operators: `{condition ? <Element /> : undefined}`, never `{condition && <Element />}`.

## Content subrepo

`packages/content` is a separate repository with its own always-on rules covering MDX formatting, frontmatter schemas, and prose style. Read `packages/content/AGENTS.md` before writing or editing anything under that directory. For sustained content work, open `packages/content` as its own project so those rules load automatically.

## Task tracking

Tracked as markdown files under `.claude/`: `tasks/` (active), `tasks-backlog/` (proposals, deferred, superseded), `tasks-completed/` (done, delete anytime). Each file in `tasks/` and `tasks-backlog/` opens with YAML frontmatter: `status` (`proposal` | `accepted` | `deferred` | `superseded`), `created` (ISO date), and optional `area`. Converted plans may also carry `priority` / `effort` / `depends` / `source`. `completed` is implied by the folder. When a task is fully done, move it to `tasks-completed/`.
