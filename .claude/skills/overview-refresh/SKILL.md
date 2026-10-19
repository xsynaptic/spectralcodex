---
name: overview-refresh
description: Refresh .claude/docs/overview.html, the architecture map and findings ledger. Use when asked to update the overview, or for a whole-system drift pass.
---

# Refresh the overview

`.claude/docs/overview.html` is the operator's map of the whole project and how healthy each part is, written for a person to read. Its value is the view across slices, the **drift** no single change can see, so a refresh is an audit as much as an edit. The code is the source of truth; a claim on the page that has drifted is a bug in the page.

The standing hazard is **recency bias**: a refresh starts from what moved, so recent work accrues detail while foundational work thins. The page describes the project as it stands; what changed, and when, belongs in the report.

`.claude/docs` is gitignored, so the page has no history. The page as it stands before you edit it is the **baseline**; the commit in its `overview-anchor` meta tag is the **anchor**.

## 1. Scope what moved

Record `git rev-parse --short HEAD` as the new anchor, today's date, and whether the tree is dirty. Read `git log --oneline <anchor>..HEAD` and `git diff --stat <anchor>`; the uncommitted tree is in scope, and when another session is changing it, leave its files alone. Measure each area of the coverage inventory (below) for the report: `git diff --shortstat <anchor> -- <path>` and its current source and test LOC.

Write fallow's output to the scratchpad: `pnpm exec fallow health --hotspots --targets`, `fallow architecture`, `fallow dupes`, and `fallow audit --base <anchor> --gate all` (the gate skips the base-snapshot pass, which loads today's config into the anchor checkout and fails when the anchor predates a file it names). Fallow sees file-level structure only; directory cycles and rules written twice are the readers' to find.

## 2. Read in parallel

Launch three read-only general-purpose subagents, the **readers**, in one message. Every brief carries the page path, the anchor and the fallow output paths. Fallow findings are leads to verify, its styling advisories ranked below code findings. Each reader reports with `path:line` evidence.

- **Page** owns the ledger. It checks every factual claim on the page against the tree (a rounded count is wrong only when meaningfully wrong) and classes every baseline ledger row fixed, filed, decided against, or standing, with the commit or line that proves it. Its brief adds the range's heavy landings.
- **Fresh** hunts the code landed since the anchor for state with two homes, a rule written twice, string twins across the host and island seam, a second path solving a problem one path already solves, dead or unexercised paths, and features whose diff is mostly plumbing, reporting only what the ledger lacks. It also lists drift in `.claude/tasks/`, `.claude/tasks-backlog/` and `.claude/glossary.md`: stale paths and lines, premises the code has overtaken, finished tasks, and a code name that contradicts a definition. A glossary entry's _Avoid_ list covers the sense that entry defines, not every use of the word. Its brief adds the range's heavy landings.
- **Coverage** weighs the whole project against the page by each part's size and centrality. Its inventory is every directory under `src/`, every workspace package (`packages/content` by its schemas and pipeline rather than its entries), `deploy/` and `tests/`. It reports what the page omits or underweights, a health class per part, and the ledger candidates it finds in the parts it reads. Its brief carries no range, so it weighs a part by what it is rather than by how recently it moved.

A reader's finding is a lead, and most leads shrink on contact. Before a candidate enters the ledger, confirm its **consequence** yourself, not just its lines: what breaks, for whom, or what every change in that area pays. Run it where that is cheap, otherwise trace it end to end. A candidate whose consequence you cannot show is dropped and named in the report.

## 3. Edit

Follow [The page](#the-page) below.

- Correct what drifted; fold new subsystems into the closest section, or add one when nothing fits.
- **Proportion**: a subject's depth follows its size and centrality. New work enters at the depth its peers carry; when it would outweigh them, condense rather than grow the section. Act on every omission the coverage reader reported.
- Redraw a diagram whose shape changed rather than patching labels onto it, and reclass every node the readers' evidence moved.
- The ledger holds only standing rows (filed means a task or backlog file names it), and a row earns its place by its confirmed cost today: a live bug, a risk one edit away, or a cost every change in its area pays. Rank each session (a focus session), quick (an afternoon or less), or watch (binds nothing yet), most consequential first.
- A rule written in more than one place gets a row in the Seams table as well as a ledger row.
- Fix task and glossary drift in place: correct the path or line, rewrite the overtaken premise, move a finished task to `tasks-completed/`. A glossary fix keeps the entry at its neighbours' length and defines the term, leaving the mechanism to the code; a missing term is proposed in the report, not added. Drift that needs the operator's call goes in the report.

## 4. Verify

1. `pnpm exec prettier --write .claude/docs/overview.html`.
2. Render the page in headless Chromium through Playwright in both colour schemes, with a script run from the repository root that imports `chromium` from `@playwright/test` (the only Playwright package installed): every `.mermaid` block draws an SVG, no ledger reference reads "(missing row)", no console errors. Look at a screenshot of each diagram.

## 5. Report

The chat is where the operator reads the refresh:

- **Taken care of since the anchor**: each dropped row with the commit that fixed it or the file that filed it, and each candidate dropped for want of a consequence.
- **Fixed in place**: the task and glossary drift corrected, and anything left for the operator's call.
- **Growth**: each area's lines changed over the range beside its current source and test LOC, and any feature whose diff was mostly plumbing.
- **The ledger's top rows**, most consequential first.

## The page

- **Header**: title, then `Updated <date>` in a `<time datetime>`, then the health legend; the anchor sits in `<meta name="overview-anchor" content="<short sha>">`. The footer repeats the date.
- **Voice**: each sentence a fact about the project as it stands, named in the glossary's and the code's terms. No commit hashes, PR numbers or branch names; cite a task by its file path, and a file by its path, with line numbers only in ledger rows. Sentences about the page itself belong only in the legend and diagram captions.
- **The product section** describes the site as a reader meets it and as it is built, at the depth a newcomer needs, and holds the health table.
- **Health classes**: every diagram node and every row of the product table carries one: `good` (works, nothing pressing), `fair` (a known cost today), `poor` (broken or blocking), `planned` (designed, not built). A class follows confirmed cost, so an open improvement, a watch row or a small seam leaves a part good. Every `fair` or `poor` row in the product table names its cost in a few words and the ledger row or task file that holds it.
- **Testing** is described by what it protects and how it runs; coverage when it is measured, never file counts.
- **Ledger references**: each row carries `id="ledger-<slug>"`; a reference is `<a class="ledger-ref" href="#ledger-<slug>"></a>`, which the page's script numbers.
- **Diagrams**: Mermaid flowcharts; labels use `<b>` and `<br>`, since `**` and `\n` render literally. An edge to or from a subgraph turns its nodes perpendicular to the flow, so stack subgraphs with invisible links between member nodes (`a ~~~ b`) and state the direction in the caption.
- **Layout**: prose and captions share one measure (`--measure`); diagrams and tables take the full width.
- **Open work** closes the page: one line per file in `.claude/tasks/`, saying what is left, and a count of the backlog.
