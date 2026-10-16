---
name: overview-refresh
description: Refresh .claude/docs/overview.html, the architecture map and findings ledger. Use when asked to update the overview, or for a whole-system drift pass.
---

# Refresh the overview

`.claude/docs/overview.html` is the operator's map of the whole project and how healthy each part is. Its value is the view across slices, the **drift** no single change can see, so a refresh is an audit as much as an edit. The code is the source of truth; a claim on the page that has drifted is a bug in the page.

The standing hazard is **recency bias**: a refresh starts from what moved, so recent work accrues detail while foundational work thins. The coverage reader and the proportion rule push back.

`.claude/docs` is gitignored, so the page has no history. The page as it stands before you edit it is the **baseline**; the commit in its subtitle is the **anchor**.

## 1. Scope what moved

Record `git rev-parse --short HEAD` as the new anchor, today's date, and whether the tree is dirty. Read `git log --oneline <anchor>..HEAD` and `git diff --stat <anchor>`; the uncommitted tree is in scope. Measure each area in the Growth table: `git diff --shortstat <anchor> -- <path>` and its current source and test LOC.

Write fallow's output to the scratchpad: `pnpm exec fallow health --hotspots --targets`, `fallow architecture`, `fallow dupes`, and `fallow audit --base <anchor>`. Fallow sees file-level structure only; directory cycles and rules written twice are the readers' to find.

## 2. Read in parallel

Launch five read-only general-purpose subagents, the **readers**, in one message. Brief each with the page path, the anchor, the range's heavy landings, and the fallow output paths. Fallow findings are leads to verify, its styling advisories ranked below code findings. Each reports with `path:line` evidence.

- **Claims**: every factual claim on the page against the tree. A rounded count is wrong only when meaningfully wrong.
- **Fresh findings**: code landed since the anchor, hunting state with two homes, a rule written twice, string twins across the host and island seam, a second path solving a problem one path already solves, thin wrappers, dead or unexercised paths, and features whose diff is mostly plumbing.
- **Coverage**: the whole project against the page, weighted by each part's size and centrality, never by how recently it moved. Its inventory is every directory under `src/` and every workspace package, `packages/content` by its schemas and pipeline rather than its entries. It reports what the page omits or underweights, and a health class per part with evidence.
- **Ledger**: the only reader that judges ledger rows. Every baseline row classed fixed, filed, decided against, or standing, with the commit or line that proves it.
- **Tasks and glossary**: every file in `.claude/tasks/` and `.claude/tasks-backlog/` against the code (what landed, what remains, whether the remainder is filed), and `.claude/glossary.md` against the names in the code.

A reader's diagnosis is a hypothesis. Verify every ledger candidate yourself before it goes in, tracing the heaviest to the line; one that fails is dropped or downgraded.

## 3. Edit

Follow [The page](#the-page) below.

- Correct what drifted; fold new subsystems into the closest section, or add one when nothing fits.
- **Proportion**: a subject's depth follows its size and centrality. New work enters at the depth its peers carry; when it would outweigh them, condense rather than grow the section. Act on every omission the coverage reader reported.
- Redraw a diagram whose shape changed rather than patching labels onto it, and reclass every node the readers' evidence moved.
- The ledger holds only standing rows (filed means a task or backlog file names it). Rank each session (a focus session), quick (an afternoon or less), or watch (binds nothing yet), most consequential first. Dropped rows go in the report.
- A rule written in more than one place gets a row in the seams table as well as a ledger row.

## 4. Verify

1. `pnpm exec prettier --write .claude/docs/overview.html`.
2. Render the page in headless Chromium through Playwright in both colour schemes: every `.mermaid` block draws an SVG, no ledger reference reads "(missing row)", no console errors. Look at a screenshot of each diagram.

## 5. Report

The chat is where the operator reads the refresh:

- **Taken care of since the anchor**: each dropped row with the commit that fixed it or the file that filed it.
- **Still undone**: unfiled task remainders and finished tasks awaiting a move to `tasks-completed/`.
- **Growth**: the range's line counts for the tracked areas, and any feature whose diff was mostly plumbing.
- **The ledger's top rows**, most consequential first.

## The page

- **Header**: title, then `Updated <date> · anchor <short sha>` with the date in a `<time datetime>`, adding `plus the uncommitted tree` when it was dirty; then the health legend. The footer repeats the stamp.
- **Voice**: each sentence a fact about the project, named in the glossary's and the code's terms; cite a task by its file path, so the sentence outlives the task's step numbers. Sentences about the page itself belong only in the legend and diagram captions.
- **Health classes**: every diagram node and every row of the product table carries one: `poor` (needs a focus session), `fair` (works, needs an afternoon or carries drift), `good` (built and tested, watch rows only), `planned` (designed, not built). A node takes the worst class of what it contains, and every `poor` or `fair` traces to a ledger row or a task file.
- **Ledger references**: each row carries `id="ledger-<slug>"`; a reference is `<a class="ledger-ref" href="#ledger-<slug>"></a>`, which the page's script numbers.
- **Diagrams**: Mermaid flowcharts; labels use `<b>` and `<br>`, since `**` and `\n` render literally.
- **Layout**: prose and captions share one measure (`--measure`); diagrams and tables take the full width.
- **Task hygiene** describes the task folders as they stand now; the history of former ledger rows lives in the report.
