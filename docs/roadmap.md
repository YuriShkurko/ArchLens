# ArchLens Roadmap

ArchLens is a language-agnostic architecture-impact analyzer for repositories. The implementation starts with TypeScript/JavaScript because deterministic import analysis is tractable, but the product goal is not TypeScript-only analysis.

Avoid expanding into AI, SaaS, dashboards, GitHub Apps, databases, auth, MCP, or broad product surfaces while the core graph and reports are still stabilizing.

## Phase 1 — JS/TS support + prove report quality

Status: in progress / v0.1.x.

Goals:

- Keep TypeScript/JavaScript snapshot, diff, risk, test, review-order, and report behavior stable.
- Continue external dogfood on real TypeScript/React changes.
- Preserve deterministic report quality improvements proven in AIJobRadar dogfood.
- Keep compact PR-ready report mode useful while preserving full details through JSON and `render --mode full`.
- Keep analyzer capability metadata in snapshots so reports state what was actually analyzed.

Near-term work:

1. **Support tsconfig path aliases**
   - Resolve imports such as `@/core/foo` or workspace aliases from `tsconfig.json`.
   - Keep unresolved imports explicit in report caveats.

2. **Improve Mermaid graph readability**
   - Group nodes by folder/package where possible.
   - Keep diagrams useful for small changes and avoid noisy output for large changes.

3. **Detect package-level modules**
   - Summarize changes at package/workspace level in addition to file-level nodes.
   - Preserve file-level facts for reviewer traceability.

4. **Improve related-test matching**
   - Add more deterministic naming and directory heuristics.
   - Consider source-to-test import edges when tests import changed source modules.

## Phase 2 — Python analyzer MVP

Status: planned, not implemented.

Why Python next:

- Many realistic target repositories are FastAPI/Python + React.
- AIJobRadar dogfood showed that mixed Python + TypeScript repos are useful targets, but Python dependency/test inference is currently a scope limitation.

MVP goals:

- Parse deterministic Python import facts.
- Resolve common relative/module imports where practical.
- Add Python test-path heuristics.
- Feed Python facts into the same language-neutral architecture graph as TypeScript/JavaScript facts.
- Keep reports honest about unsupported or unresolved Python patterns.

Non-goals for the Python MVP:

- no AI inference;
- no deep symbol/call graph;
- no full type analysis;
- no plugin loader yet.

## Phase 3 — Formal analyzer adapter/plugin architecture

Status: future.

Only introduce a formal analyzer interface after at least two analyzers exist and the core graph has stabilized through dogfood.

Likely goals:

- Define a small analyzer adapter contract.
- Keep analyzer metadata first-class.
- Allow analyzers to emit nodes, edges, test evidence, capabilities, and limitations.
- Keep the impact/risk/reporting engines language-neutral.

Do not build this prematurely. A plugin framework before a second analyzer would likely encode the wrong abstractions.
