# ArchLens Architecture

ArchLens is a repository-focused architecture-impact analyzer. It is not a TypeScript-only product.

The v0.1.x implementation ships with TypeScript/JavaScript analysis first because those languages are practical to analyze deterministically with local static imports. The product model is broader: language-specific analyzers feed facts into a shared, language-neutral architecture graph.

```text
TypeScript/JavaScript analyzer ─┐
Python analyzer                 ├─> Core Architecture Graph ─> Impact/Risk/Reporting
Go analyzer                     │
Java analyzer                   ┘
```

Python support is planned next because many real target repositories are FastAPI/Python + React. It is not implemented yet.

## Language-neutral core model

The core model should remain independent of any one parser or language ecosystem. It consists of:

- **Architecture nodes** — files/modules/packages or other structural units.
- **Architecture edges** — dependency relationships such as imports.
- **Snapshots** — deterministic repository architecture facts at a point in time.
- **Diffs** — added, removed, and changed nodes/edges between refs.
- **Risk signals** — deterministic review warnings derived from facts.
- **Test evidence** — changed tests, potential related tests, and unsupported inference areas.
- **Review order** — deterministic ordering for human review.
- **Reports** — Markdown and future renderers generated from the language-neutral facts.

## Analyzer role

Language analyzers produce facts for the core graph. They may know how to parse imports, resolve relative paths, identify tests, or report language-specific limitations.

The reporting engine should not care whether facts came from TypeScript, Python, Go, Java, or another analyzer. It should render:

- which facts were analyzed;
- which analyzers produced those facts;
- which language areas were unsupported;
- which limitations affect the report.

## Current v0.1.x shape

Current analyzer metadata is recorded in snapshots under `analyzers`.

The first analyzer is `typescript-javascript`, covering:

- TypeScript
- JavaScript
- TSX
- JSX
- `.mjs`
- `.cjs`

This is intentionally analyzer-shaped, but ArchLens does not yet have a plugin loader or formal adapter framework. That should wait until at least two analyzers exist and the core graph has stabilized.

## Boundaries

ArchLens v0.1.x does not implement:

- Python import analysis;
- a plugin system;
- AI inference;
- GitHub App behavior;
- SaaS/dashboard/database/auth/MCP surfaces.

Unsupported language files may still appear as repository facts so reports can say, honestly, that they changed but were not dependency-analyzed in this version.
