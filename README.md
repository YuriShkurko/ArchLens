# ArchLens

**See how every code change affects your architecture.**

ArchLens is a local-first, language-agnostic architecture-impact tool for repositories. The current v0.2.x implementation ships with TypeScript/JavaScript and Python analyzer facts, records file-level architecture snapshots, compares git refs, and renders a Markdown report with detected structural facts, dependency-edge changes, deterministic risk signals, related tests, unsupported language scope, and a suggested review order.

Good commit messages explain what changed. ArchLens explains how the system structure changed.

```text
git change → architecture snapshot → architecture diff → risk/impact report
```

ArchLens is **not** a commit-summary generator, PR-description generator, AI code reviewer, bug finder, SaaS dashboard, GitHub App, database-backed service, or chatbot.

## Quickstart

Clone and install:

```bash
git clone https://github.com/YuriShkurko/ArchLens.git
cd ArchLens
pnpm install
```

Build the workspace:

```bash
pnpm build
```

Create a snapshot of the current working tree:

```bash
pnpm archlens snapshot
```

Compare two git refs:

```bash
pnpm archlens diff --base main --head HEAD
```

Render the compact PR-ready Markdown report:

```bash
pnpm archlens render
```

Render the full-detail Markdown report when you need complete node/edge lists and the full Mermaid diagram:

```bash
pnpm archlens render --mode full
```

Outputs are written locally under `.archlens/`:

- `.archlens/snapshot.json` — architecture snapshot of the current repo.
- `.archlens/architecture-diff.json` — structural diff between git refs.
- `.archlens/architecture-impact.md` — reviewer-facing architecture-impact report.

If using the built CLI binary directly inside this workspace, run `apps/cli/dist/index.js` after `pnpm build`. The CLI package also exposes a `bin` named `archlens`; publishing is intentionally out of scope for v0.1.

## What ArchLens reports

The Markdown report clearly separates:

- analyzer scope, including TypeScript/JavaScript and Python capabilities/limitations;
- concise architecture story derived from dependency facts;
- compact key detected facts by default, with full facts available through `--mode full`;
- inferred risk signals split between supported-analyzer test gaps and unsupported-language scope limitations;
- changed test files;
- potential related existing tests;
- unsupported related-test inference areas;
- dependency-centrality-aware suggested review order;
- author-provided context;
- appendix limitations, caveats, and optional Mermaid details.

ArchLens does not invent author intent and does not write generic PR summaries. The default report is compact enough for PR review; full details remain available in `.archlens/architecture-diff.json` and `archlens render --mode full`.

## Git diff vs ArchLens

`git diff` shows line-level and file-level changes. That is still the source of truth for exact code edits.

ArchLens looks at the same change from a structural review angle:

- which modules/files were added, removed, or changed;
- which dependency edges were added or removed;
- which deterministic risk signals were triggered;
- which existing tests may be related;
- which files should be reviewed first.

Use ArchLens alongside `git diff`, not instead of it.

## Dogfood example

A realistic v0.1 dogfood case is a change that adds GitHub Actions CI in `.github/workflows/ci.yml`.

A commit message might say: `Add CI workflow`.

ArchLens reports different information:

```markdown
## Detected facts

### Added files or modules

- `.github/workflows/ci.yml (workflow, yaml — operations-sensitive, workflow)`

### Added dependency edges

- None detected.

## Inferred risk signals

- **WARNING — Workflow/config/deployment file changed** (operations)
  - Workflow/config files changed. This may affect CI, validation, build, runtime, or release behavior. Verify the relevant workflow or command has run successfully before merge.

## Suggested review order

- `.github/workflows/ci.yml`
```

See `examples/ci-dogfood-architecture-impact.md` for the full example.

## Current limitations

- v0.2.x supports TypeScript/JavaScript plus a Python analyzer MVP; ArchLens is not intended to remain limited to these languages.
- Python support is deterministic and limited: common `import ...`, `from ... import ...`, and basic relative imports are analyzed when they resolve to local files.
- Common generated/local directories are ignored by default, including `.git/`, `.venv/`, `venv/`, `env/`, `node_modules/`, `dist/`, `build/`, `.next/`, `.turbo/`, `.cache/`, `coverage/`, `.pytest_cache/`, `__pycache__/`, and `.archlens/`.
- TypeScript path aliases and non-relative imports may be unresolved.
- Python dynamic/runtime imports, namespace package edge cases, type analysis, symbol/call graphs, and FastAPI route intelligence are not implemented.
- JavaScript dynamic imports are only detected when the specifier is a string literal.
- Risk signals are deterministic heuristics, not proof of bugs.
- No AI inference.

## Development

```bash
pnpm typecheck
pnpm build
pnpm test
```

Root package scripts are intentionally small:

- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `pnpm archlens -- <command>` / `pnpm archlens snapshot`

## Roadmap

See `docs/architecture.md`, `docs/language-support.md`, and `docs/roadmap.md`.

## Inspiration and licensing

ArchLens was inspired by structural-analysis patterns in `github.com/dpopsuev/locus` and `github.com/dpopsuev/oculus`; see `docs/inspiration-report.md`. No source code was copied.
