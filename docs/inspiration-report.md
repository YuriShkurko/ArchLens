# ArchLens Inspiration Report: Locus + Oculus

Stage One was inspection only. Sources inspected from local `opensrc` cache:

- `github.com/dpopsuev/locus` at `~/.opensrc/repos/github.com/dpopsuev/locus/main`
- `github.com/dpopsuev/oculus` at `~/.opensrc/repos/github.com/dpopsuev/oculus/main`

No code was copied. The repo READMEs state MIT licensing, but this ArchLens slice only borrows product/architecture patterns.

## 1. What each repo does

- **Locus** is a CLI/MCP “graph walker” for AI agents. It scans repositories, caches architecture/symbol reports, exposes analysis actions, and renders Mermaid diagrams. It is the user-facing command/server layer.
- **Oculus** is the underlying analysis engine. It builds language-aware project, symbol, dependency, architecture, and history models. Its axiom is useful for ArchLens: emit structural facts first; let downstream tooling interpret risk.

## 2. How they model files/modules

- Oculus models a project as `Project -> Namespace -> File/Symbol`. A namespace maps to a package/module/import path, and files carry path/package/line metadata.
- Oculus also has `SymbolGraph` with `Symbol` nodes and typed `SymbolEdge`s for calls/implements/etc.
- Locus mostly wraps Oculus models through CLI/MCP/store adapters.
- ArchLens v0.1 should stay coarser: file/module nodes plus import edges, not symbol graphs.

## 3. How they build dependency graphs

- Oculus has a `DependencyGraph` of namespace-to-namespace edges. Duplicate dependency edges increment weight.
- Oculus scanners can use LSP, tree-sitter, language ASTs, ctags, or regex fallback depending on language and requested depth.
- Locus routes scan requests into Oculus engine methods and caches results by repo/SHA.
- ArchLens v0.1 should use a deterministic TypeScript/JavaScript import scanner and resolve local relative imports to file nodes where practical.

## 4. How they represent architecture/system structure

- Oculus converts project data into an `ArchModel` of services/components and `ArchEdge`s. Components can be package-level or grouped via configured component groups.
- Architecture reports include graph metrics such as fan-in/fan-out, cycles, hot spots, boundary crossings, and test coverage proxies.
- ArchLens should represent system structure as `ArchitectureSnapshot`: nodes, edges, and stats. Risk should be a separate report layer, clearly marked as inferred.

## 5. How they store snapshots

- Locus/Oculus cache reports by repo path + git SHA + scanner/version hash, commonly as gzipped JSON in an XDG/cache directory. History is recorded separately.
- ArchLens should avoid global cache complexity for v0.1 and write local files under `.archlens/`: `snapshot.json`, `architecture-diff.json`, and `architecture-impact.md`.

## 6. How they visualize architecture

- Oculus renders architecture models to Mermaid flowcharts and Markdown reports.
- Locus exposes many diagram types via CLI/MCP, all in Mermaid/facts formats.
- ArchLens v0.1 only needs one small Mermaid dependency graph in the Markdown report.

## 7. Whether they support diffs between versions

- Oculus supports symbol graph diffs and codograph/report diffs: added/removed components, added/removed edges, churn deltas, LOC deltas, and summaries.
- Locus exposes history, branch diff, scan diff, component diff, and symbol diff actions through CLI/MCP.
- ArchLens should implement a small snapshot diff: added/removed nodes, added/removed edges, changed nodes, risk signals, and review order.

## 8. Useful ideas for ArchLens

- Keep analysis deterministic and fact-first.
- Model architecture separately from rendered reports.
- Use directed dependency edges as the central architecture signal.
- Keep snapshots/diffs serializable and schema-validated.
- Include Mermaid in Markdown for immediate reviewer context.
- Include “unknowns” rather than pretending intent or complete coverage.

## 9. Ideas too large/out of scope

- MCP server and AI-agent workflow integration.
- Multi-language LSP orchestration.
- Symbol/call graph accuracy, scenario tracing, and diagnose/book knowledge graph.
- Global cache/history stores, remote repository scanning, desired-state constraints, and rich diagram suites.
- Scoring systems beyond simple named risk signals.

## 10. Smallest architecture-impact slice for ArchLens

Implement a local TypeScript CLI that:

1. scans TypeScript/JavaScript files into file-level architecture snapshots;
2. extracts static import/export dependencies and resolves local relative imports;
3. compares base/head snapshots using git worktrees or git archive extraction;
4. reports added/removed files, added/removed dependency edges, changed modules, and deterministic risk signals;
5. renders a Markdown report with separate sections for detected facts, inferred risk, unknowns, suggested review order, and a small Mermaid graph.

This is enough to prove ArchLens’s positioning: good commit messages explain what changed; ArchLens explains how the system structure changed.
