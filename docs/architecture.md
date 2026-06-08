# ArchLens Architecture

ArchLens is a repository-focused architecture-impact analyzer. It is not a TypeScript-only product.

The v0.2.x implementation ships with TypeScript/JavaScript analysis and a Python analyzer MVP. Language-specific analyzers feed facts into a shared, language-neutral architecture graph.

```text
TypeScript/JavaScript analyzer ─┐
Python analyzer                 ├─> Core Architecture Graph ─> Impact/Risk/Reporting
Go analyzer                     │
Java analyzer                   ┘
```

## Language-neutral core model

The core model remains independent of any one parser or language ecosystem. It consists of:

- **Architecture nodes** — files/modules/packages or other structural units.
- **Architecture edges** — dependency relationships such as imports.
- **Snapshots** — deterministic repository architecture facts at a point in time.
- **Diffs** — added, removed, and changed nodes/edges between refs.
- **Risk signals** — deterministic review warnings derived from facts.
- **Test evidence** — changed tests, potential related tests, and unsupported inference areas.
- **Review order** — deterministic ordering for human review.
- **Reports** — Markdown and future renderers generated from the language-neutral facts.

## Analyzer role

Language analyzers produce facts for the core graph. They may know how to parse imports, resolve local paths, identify tests, or report language-specific limitations.

The reporting engine should not care whether facts came from TypeScript, Python, Go, Java, or another analyzer. It should render:

- which facts were analyzed;
- which analyzers produced those facts;
- which language areas were unsupported;
- which limitations affect the report.

## Current analyzer shape

Current analyzer metadata is recorded in snapshots under `analyzers`.

The `typescript-javascript` analyzer covers:

- TypeScript
- JavaScript
- TSX
- JSX
- `.mjs`
- `.cjs`

The `python` analyzer MVP covers:

- `.py` files;
- common static `import ...` and `from ... import ...` forms;
- basic relative imports;
- local module resolution to `.py` and `__init__.py` files;
- deterministic Python related-test path heuristics.

The Python analyzer does not implement dynamic/runtime import resolution, type analysis, symbol/call graphs, namespace package completeness, or FastAPI route intelligence.

ArchLens still does not have a plugin loader or formal adapter framework. That boundary should be extracted after the current analyzers have stabilized through dogfood, not before.

## Boundaries

ArchLens v0.2.x does not implement:

- a plugin system;
- AI inference;
- GitHub App behavior;
- SaaS/dashboard/database/auth/MCP surfaces;
- deep symbol or call graphs;
- FastAPI-specific route analysis;
- broad multi-language support beyond the current analyzers.

Unsupported language files may still appear as repository facts so reports can say, honestly, that they changed but were not dependency-analyzed in this version.
