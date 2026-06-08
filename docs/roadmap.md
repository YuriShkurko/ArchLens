# ArchLens Roadmap

ArchLens is a language-agnostic architecture-impact analyzer for repositories. The implementation started with TypeScript/JavaScript because deterministic import analysis is tractable; v0.2.0 adds a Python analyzer MVP while preserving the same shared core graph.

Avoid expanding into AI, SaaS, dashboards, GitHub Apps, databases, auth, MCP, or broad product surfaces while the core graph and reports are still stabilizing.

## Phase 1 — JS/TS support + prove report quality

Status: stable baseline / v0.1.5.

Completed goals:

- TypeScript/JavaScript snapshot, diff, risk, test, review-order, and report behavior stabilized enough for dogfood.
- External dogfood on AIJobRadar reached 4.4 / 5 usefulness and 4 / 5 PR paste score.
- Compact PR-ready report mode exists while full details remain available through JSON and `render --mode full`.
- Analyzer capability metadata is recorded in snapshots and reports.

## Phase 2 — Python analyzer MVP

Status: in progress / v0.2.0.

Why Python next:

- Many realistic target repositories are FastAPI/Python + React.
- AIJobRadar dogfood showed that mixed Python + TypeScript repos are useful targets.
- v0.1.5 surfaced Python honestly as unsupported; v0.2.0 should turn common Python imports and test paths into deterministic graph facts.

MVP goals:

- Parse deterministic Python import facts.
- Resolve common relative/module imports where practical.
- Add Python test-path heuristics.
- Feed Python facts into the same language-neutral architecture graph as TypeScript/JavaScript facts.
- Keep reports honest about unsupported or unresolved Python patterns.
- Preserve v0.1.5 TypeScript/React report quality and compact PR mode.

Non-goals for the Python MVP:

- no AI inference;
- no deep symbol/call graph;
- no full type analysis;
- no FastAPI route intelligence;
- no runtime import or `sys.path` analysis;
- no plugin loader yet.

## Phase 3 — Stabilize analyzer boundary

Status: future.

Only introduce a formal analyzer interface after the TypeScript/JavaScript and Python analyzers both prove their needs through dogfood.

Likely goals:

- Define a small analyzer adapter contract.
- Keep analyzer metadata first-class.
- Allow analyzers to emit nodes, edges, test evidence, capabilities, and limitations.
- Keep the impact/risk/reporting engines language-neutral.

Do not build this prematurely. A plugin framework before the second analyzer is dogfooded would likely encode the wrong abstractions.

## Later possibilities

- Support tsconfig path aliases.
- Improve Mermaid graph readability.
- Detect package-level modules while preserving file-level facts.
- Improve related-test matching through deterministic source-to-test import edges.
- Consider Go, Java, and other ecosystems after the core graph and Python analyzer prove the model.
