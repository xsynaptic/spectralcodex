# Spectral Codex scripts

Build, content and deploy scripts for [Spectral Codex](https://spectralcodex.com). Each one is a `package.json` entry, most with a root alias, and `--help` lists its options. The [main readme](../../readme.md) describes what the pipeline does; this one covers how the scripts are put together.

## Writing a script

An entry point ends with `runCommand(defineCommand({ … }))` from `src/shared/cli-command.ts`. The wrapper handles flag parsing (strict `parseArgs` from `node:util`), output, exit codes and Ctrl-C.

Paths come from `CONTENT_DATA_PATH`, `CONTENT_MEDIA_PATH` and `CUSTOM_CACHE_PATH` through `@spectralcodex/shared/paths`, the same resolver the Astro config uses.

## Why not the `tsx` CLI

Scripts run as `node --env-file-if-exists=… --import tsx`. The `tsx` CLI forwards Ctrl-C to its child and sends SIGKILL if the child's event loop stays busy for about 60 ms, which kills a long render before it can save.

## Interrupting

One Ctrl-C arrives as several signals: SIGINT from the terminal, a copy forwarded by pnpm, and a SIGTERM from each nested pnpm. Anything in the first second counts as one press, which stops at the next safe point and keeps finished work. A second press force-quits. Interrupted runs exit with 130.

## Deploy uploads

`deploy-images` and `deploy-og` upload changed files and never delete on the server. `--prune-remote` removes remote files missing from the local cache, refuses past 2% of them without `--allow-mass-prune`, and waits for you to type `prune`.
