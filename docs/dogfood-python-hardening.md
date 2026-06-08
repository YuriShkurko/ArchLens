# Python Analyzer Hardening Dogfood — AgentForge

Date: 2026-06-08

## Selected repo

Selected repo: `/home/yuri/Desktop/projects/AgentForge`

Why selected over `review-insight-tool`:

- It exists locally and is Python-heavy.
- It has a larger Python graph than `review-insight-tool` in the current checkout.
- Recent history includes meaningful Python source and test changes.
- It has enough imports/tests to exercise Python import resolution, related-test labeling, source-to-test matching, and review-order rationale.

Pre-existing target repo status note: `AgentForge` already had unrelated untracked local files/directories before this run (`.merge-memo/`, `agentforge/`, Docker/Scribe helper files, and a setup report). I did not modify those.

## Base/head used

`HEAD~1..HEAD` changed only one Python source file and produced no risk or dependency-edge changes, so I used a nearby meaningful Python commit range:

- Base: `HEAD~3` = `0022bd4f2a1d4126b29cb68a6f84460955b19adc`
- Head: `HEAD~2` = `d992e93883abed364a3b127f156d70727fc531d6`

This range changes generator source and related generator tests.

## Commands run

From `/home/yuri/Desktop/projects/ArchLens`:

```bash
pnpm typecheck
pnpm build
pnpm test
```

From `/home/yuri/Desktop/projects/AgentForge`, using the local ArchLens CLI build:

```bash
rm -rf .archlens
node ../ArchLens/apps/cli/dist/index.js snapshot
node ../ArchLens/apps/cli/dist/index.js diff --base HEAD~3 --head HEAD~2
node ../ArchLens/apps/cli/dist/index.js render --mode pr
node ../ArchLens/apps/cli/dist/index.js render --mode full
```

Generated files inspected:

- `.archlens/snapshot.json`
- `.archlens/architecture-diff.json`
- `.archlens/architecture-impact.md`
- `/tmp/archlens-agentforge-v021-pr.md`
- `/tmp/archlens-agentforge-v021-full.md`

Cleanup after inspection:

```bash
rm -rf /home/yuri/Desktop/projects/AgentForge/.archlens
```

## Snapshot/diff counts

Observed with v0.2.1 hardening changes:

- Snapshot nodes: 346
- Snapshot edges: 417
- Python nodes: 191
- Python import edges: 342
- Added files/modules: 0
- Changed files/modules: 6
- Added dependency edges: 0
- Removed dependency edges: 0
- Risk signals: 0

Changed test files:

- `tests/generator/test_app_shape_blueprint.py`
- `tests/generator/test_pipeline_kanban_generation.py`
- `tests/generator/test_recipe_surfaces.py`

Potential related Python tests:

- `tests/generator/test_app_shape_blueprint.py`
- `tests/generator/test_model_driven.py`

## Useful Python import edges found

The snapshot contained useful local Python edges, including imports among the generator package and generated example apps. For the analyzed diff, the most useful review-order edge was:

- `generator/agentforge/app_shape_blueprint.py -> generator/agentforge/recipes/_base.py`
- `generator/agentforge/recipes/pipeline_kanban.py -> generator/agentforge/recipes/_base.py`

This produced the deterministic rationale:

```markdown
- `generator/agentforge/recipes/_base.py` ranked early because Python module is imported by 2 changed modules.
```

The related-test section was clearly labeled by analyzer language:

```markdown
### Potential related existing tests

- Potential related tests found by deterministic path/import heuristics; this is not proof of coverage.
- Python:
  - `tests/generator/test_app_shape_blueprint.py`
  - `tests/generator/test_model_driven.py`
- TypeScript/JavaScript:
  - none found
```

## False positives / noisy edges

Dogfood found one important noisy edge class before hardening:

- `generator/agentforge/model_driven.py` contains triple-quoted generated Python app templates.
- The v0.2.0 line scanner treated import-looking lines inside those templates as live imports.
- That incorrectly resolved template imports such as `from app import models` to example app files like `examples/hybrid-scoring-demo/backend/app/models.py`.

v0.2.1 hardening fixed this by ignoring import-looking lines inside triple-quoted string blocks. After the fix, `generator/agentforge/model_driven.py` only kept its real local import edge to `generator/agentforge/pack.py` in this dogfood run.

Remaining honest limitations:

- Python import resolution is still heuristic.
- Template strings that intentionally represent generated code are ignored; ArchLens analyzes the current repository code, not generated future files.
- There is still no runtime `sys.path`, dynamic import, symbol, call graph, or framework route analysis.

## Review-order usefulness

Suggested review order:

1. `generator/agentforge/app_shape_blueprint.py`
2. `generator/agentforge/recipes/_base.py`
3. `generator/agentforge/model_driven.py`
4. `generator/agentforge/recipes/pipeline_kanban.py`
5. changed generator tests

This was useful. It surfaced the shared recipe base module between changed generator modules even though there were no added/removed dependency edges in the diff.

## Scores

- PR paste score: **4 / 5**
- Overall usefulness score: **4.3 / 5**

Why not higher:

- This commit range has no added/removed edges, so the report is less explanatory than the AIJobRadar mixed backend/frontend diff.
- Related-test suggestions are useful but still heuristic.

Why it is still a good hardening signal:

- The report stayed compact.
- It labeled Python test evidence clearly.
- It exposed and helped fix a concrete false-positive class in Python import scanning.
- It produced useful Python centrality rationale from existing graph edges.

## Concrete issues found

1. **Fixed:** import-like lines inside triple-quoted generated code strings caused noisy Python edges.
2. **Improved:** Python review-order rationale now explains shared dependency fan-in from changed modules, not only added edges.
3. **Improved:** potential related tests are labeled by analyzer/language.
4. **No source-root expansion needed beyond allowed heuristics:** `app` and `backend` remain useful source-root candidates, but the main AgentForge issue was string-template parsing, not root discovery.
5. **No evidence to add broader resolution:** no runtime path or package-resolution rewrite is justified by this dogfood.

## Decision

**Decision: continue.** The second Python-heavy dogfood run found a real Python analyzer trust issue, v0.2.1 fixed it with a small deterministic scanner hardening, and PR-mode output remained useful without adding AI, a plugin framework, FastAPI intelligence, or new language analyzers.
