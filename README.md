# ArchLens

**See how every code change affects your architecture.**

ArchLens is a local-first developer CLI that turns git changes into architecture-impact reports.

ArchLens is **not** a commit-summary generator, PR-description generator, AI code reviewer, bug finder, SaaS dashboard, or chatbot.

Good commit messages explain what changed. ArchLens explains how the system structure changed.

```text
git change → architecture snapshot → architecture diff → risk/impact report
```

## v0.1 scope

- TypeScript/JavaScript files first.
- File/module nodes.
- Static import/export and simple `require()` / string-literal dynamic import edges.
- Local `.archlens/` JSON and Markdown outputs.
- Deterministic risk signals; no AI inference.

## Commands

```bash
pnpm install
pnpm build

archlens snapshot
archlens diff --base main --head HEAD
archlens render
```

During local development, use:

```bash
pnpm archlens snapshot
pnpm archlens diff --base main --head HEAD
pnpm archlens render
```

## Outputs

- `.archlens/snapshot.json` — architecture snapshot of the current repo.
- `.archlens/architecture-diff.json` — structural diff between git refs.
- `.archlens/architecture-impact.md` — reviewer-facing architecture-impact report.

## Report positioning

The Markdown report clearly separates:

- detected structural facts;
- inferred risk signals;
- author-provided context;
- unknowns.

ArchLens does not invent author intent and does not write generic PR summaries. It helps reviewers see structural impact, dependency changes, risk areas, related tests, and a suggested review order.

## Dogfood example

A realistic v0.1 dogfood case is a change that adds GitHub Actions CI in `.github/workflows/ci.yml`.

A commit message might say: `Add CI workflow`.

ArchLens should report different information:

- detected fact: `.github/workflows/ci.yml` was added;
- detected fact: no TypeScript/JavaScript dependency edges changed;
- inferred risk: workflow/config changes may affect validation or release behavior;
- suggested review order: inspect the workflow file first;
- unknown: whether GitHub Actions has passed yet.

See `examples/ci-dogfood-architecture-impact.md` for the full example. Good commit messages explain what changed. ArchLens explains how the system structure changed.

## Development

```bash
pnpm typecheck
pnpm build
pnpm test
```

## Inspiration and licensing

ArchLens was inspired by structural-analysis patterns in `github.com/dpopsuev/locus` and `github.com/dpopsuev/oculus`; see `docs/inspiration-report.md`. No source code was copied.
