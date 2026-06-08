# ArchLens usage

ArchLens is currently intended for local evaluation from source. It is not published to npm yet.

## Requirements

- Node.js 20+
- pnpm 9+
- git available on `PATH`
- a target repository with at least one commit for `diff`

## Option A: development workspace usage

From the ArchLens checkout:

```bash
pnpm install
pnpm build
pnpm archlens -- snapshot
pnpm archlens -- diff --base main --head HEAD
pnpm archlens -- render --mode pr
```

Outputs are written to `.archlens/` in the target git repository:

- `.archlens/snapshot.json`
- `.archlens/architecture-diff.json`
- `.archlens/architecture-impact.md`

To run ArchLens against another local repository without installing globally:

```bash
cd /path/to/other/repo
node /path/to/ArchLens/apps/cli/dist/index.js snapshot
node /path/to/ArchLens/apps/cli/dist/index.js diff --base main --head HEAD
node /path/to/ArchLens/apps/cli/dist/index.js render --mode pr
```

## Option B: local global/link-style usage

From the ArchLens checkout:

```bash
pnpm install
pnpm build
cd apps/cli
npm link
archlens --help
```

Then run from any target repository:

```bash
archlens snapshot
archlens diff --base main --head HEAD
archlens render --mode pr
```

This uses `npm link` because it works without pnpm global-bin setup in the current monorepo. To remove the link later, run `npm unlink -g @archlens/cli`.

## Option C: package smoke test without publishing

Use the included smoke test to verify that the CLI package can be packed, installed into a temporary git repo, and run end to end:

```bash
scripts/smoke-pack.sh
```

The script:

1. builds `@archlens/core` and `@archlens/cli`;
2. packs both packages locally;
3. creates a temporary git repo;
4. installs the packed tarballs;
5. commits a tiny TypeScript app;
6. makes and commits a small import change;
7. runs `archlens --help`, `snapshot`, `diff`, and `render`;
8. verifies `.archlens/architecture-impact.md` exists;
9. removes temporary files on exit.

No npm publish is performed.

## Basic command flow

```bash
archlens snapshot
archlens diff --base HEAD~1 --head HEAD
archlens render --mode pr
```

Use `main...HEAD` style comparisons by passing the refs explicitly:

```bash
archlens diff --base main --head HEAD
```

`diff` requires both refs to exist locally. Fetch remote branches first if needed.

## PR mode vs full mode

`archlens render --mode pr` writes the compact PR-ready report. It caps long lists, groups large-change risk areas, and points to JSON/full mode for details.

`archlens render --mode full` writes a longer report with complete node/edge details and fuller Mermaid output where available.

Both modes read `.archlens/architecture-diff.json` and write `.archlens/architecture-impact.md`.

## Recommended first test repo

Use a small repository with at least two commits and a simple TypeScript/JavaScript or Python import change. For example:

1. commit `src/util.ts` and `src/index.ts` where `index.ts` imports `util.ts`;
2. add `src/format.ts` and import it from `index.ts`;
3. run `archlens diff --base HEAD~1 --head HEAD`;
4. run `archlens render --mode pr`.

This should produce a small report with changed files and a new dependency edge.

## Common errors and fixes

### Not inside a git repository

Run ArchLens from a repository root or subdirectory:

```bash
cd /path/to/repo
archlens snapshot
```

### Repo has no commits

Create at least one commit before running `diff`:

```bash
git add .
git commit -m "initial commit"
```

### Base or head ref does not exist

Use refs that exist locally:

```bash
git log --oneline --decorate -5
archlens diff --base HEAD~1 --head HEAD
```

If comparing a remote branch, fetch it first.

### Running render before diff

`render` needs `.archlens/architecture-diff.json`:

```bash
archlens diff --base HEAD~1 --head HEAD
archlens render --mode pr
```

### git is unavailable

Install git and ensure `git --version` works in the same shell where you run ArchLens.

## Current scope reminders

ArchLens v0.2.x supports TypeScript/JavaScript and a Python analyzer MVP. It does not include AI inference, GitHub App support, SaaS/dashboard features, a plugin framework, new language analyzers, FastAPI route intelligence, deep symbol graphs, or call graphs.
