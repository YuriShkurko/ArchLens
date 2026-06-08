# External Dogfood Check — AIJobRadar with ArchLens v0.2.0

Date: 2026-06-08

## Candidate repo

Selected repo: `/home/yuri/Desktop/projects/AIJobRadar`

Why selected:

- It is the same mixed FastAPI/Python + React/TypeScript repo used for v0.1.2–v0.1.5 dogfood.
- It has a meaningful recent architecture diff across backend Python and frontend TypeScript.
- It directly tests the v0.2.0 Python Analyzer MVP goal: Python files should feed the same core graph instead of only appearing as unsupported scope.

Base/head used:

- Base: `HEAD~1` = `be06dc5c50fb961106e72ca8087f1d1f1bb2fd5e`
- Head: `HEAD` = `aeca9b8c67ed500a8de55b5bad954eb34ed791e7`

Pre-existing target repo status note: `AIJobRadar` already had unrelated untracked local files/directories before this rerun (`ai-job-radar/`, `docker-compose.scribe.yml`, `docker/`, `scribe-docker-global.sh`, `scribe-docker-local.sh`). I did not modify those.

## Commands run

From `/home/yuri/Desktop/projects/ArchLens`:

```bash
pnpm typecheck
pnpm build
pnpm test
```

From `/home/yuri/Desktop/projects/AIJobRadar`, using the local ArchLens CLI build:

```bash
rm -rf .archlens
node ../ArchLens/apps/cli/dist/index.js snapshot
node ../ArchLens/apps/cli/dist/index.js diff --base HEAD~1 --head HEAD
node ../ArchLens/apps/cli/dist/index.js render --mode pr
node ../ArchLens/apps/cli/dist/index.js render --mode full
```

Generated files inspected in the target repo:

- `.archlens/snapshot.json`
- `.archlens/architecture-diff.json`
- `.archlens/architecture-impact.md`
- copied PR-mode and full-mode outputs during inspection before cleanup

Cleanup after inspection:

```bash
rm -rf /home/yuri/Desktop/projects/AIJobRadar/.archlens
```

## Command results

All dogfood commands succeeded.

Observed v0.2.0 snapshot/diff counts:

- Snapshot nodes: 134
- Snapshot edges: 204
- Python nodes: 91
- Python import edges: 186
- Active analyzers: `typescript-javascript`, `python`
- Added files/modules: 19
- Changed files/modules: 22
- Added dependency edges in diff: 28
- Removed dependency edges in diff: 2
- Changed test files: 0
- Potential related tests: 2
  - `backend/tests/test_normalization.py`
  - `backend/tests/test_scoring.py`

Risk signals observed:

- `supported-source-changed-without-tests`: 11 paths
- `config-or-workflow-changed`: 5 paths
- `dependency-edges-added`: 23 paths
- `oversized-architecture-change`: 41 paths

Notably absent:

- No `unsupported-source-changed-test-inference-unavailable` signal for Python files.
- No Python unsupported-language summary in report scope.

## Comparison against v0.1.5

| Version | Snapshot nodes | Snapshot edges | Python edges | Python support behavior | Overall usefulness | PR paste score |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| v0.1.5 | 134 | 18 | 0 | Python files surfaced honestly as unsupported; no Python import/test inference | 4.4 / 5 | 4 / 5 |
| v0.2.0 | 134 | 204 | 186 | Python imports become graph edges; likely backend tests are suggested | 4.6 / 5 | 4 / 5 |

## Excerpt from generated PR-mode architecture-impact report

```markdown
## Analyzer scope

- ArchLens analyzed TypeScript/JavaScript and Python architecture facts in this repository.
- Active analyzer metadata: `python`, `typescript-javascript`.
- Python analyzer limitations: `dynamic-imports-not-resolved`, `runtime-imports-not-resolved`, `no-type-analysis`, `no-symbol-call-graph`, `namespace-package-resolution-limited`, `fastapi-route-analysis-not-implemented`.
```

Python dependency facts now appear in the same graph as TypeScript/JavaScript facts:

```markdown
- Added dependency edges: 28
  - Examples: `backend/src/ai_job_radar/application/services/notify_jobs.py -> backend/src/ai_job_radar/infrastructure/rendering/card_renderer.py (import)`, `backend/src/ai_job_radar/infrastructure/providers/cv_profile/provider.py -> backend/src/ai_job_radar/domain/entities/candidate_tech_profile.py (import)`, `backend/src/ai_job_radar/interfaces/api/deps.py -> backend/src/ai_job_radar/infrastructure/providers/cv_profile/provider.py (import)` (+25 more)
```

Tests section improved from unsupported Python scope to useful backend test hints:

```markdown
### Changed test files

- None detected.

### Potential related existing tests

- `backend/tests/test_normalization.py`
- `backend/tests/test_scoring.py`

### Unsupported related-test inference

- No changed files requiring unsupported-language related-test inference were detected.
```

Review-order rationale now includes a Python shared dependency:

```markdown
### Review-order rationale

- `frontend/src/types.ts` ranked early because it is imported by 3 changed route modules.
- `frontend/src/api.ts` ranked early because it is imported by 3 changed route modules.
- `frontend/src/components/JobCard.tsx` ranked early because it is imported by 3 changed route modules.
- `backend/src/ai_job_radar/infrastructure/rendering/card_renderer.py` ranked early because it is imported by 2 changed modules.
```

## Evaluation checklist

Scores are 1–5, where 1 is poor and 5 is excellent.

| Checklist item | Score | Notes |
| --- | ---: | --- |
| Did ArchLens detect real structural changes? | 5 | Yes. It now detects both TS/React and Python import-level graph changes. |
| Did Python imports produce useful edges? | 5 | Yes. 186 Python edges appeared in the snapshot and 10 additional Python-driven dependency edges appeared in the diff compared with v0.1.5. |
| Did Python changed files stop appearing as unsupported? | 5 | Yes. Active analyzer scope lists Python support, and unsupported-language inference no longer includes `.py`. |
| Did related Python tests improve? | 4 | Yes. It found `backend/tests/test_normalization.py` and `backend/tests/test_scoring.py`. It remains heuristic and should not claim certainty. |
| Did TS/React report quality stay stable? | 4 | Mostly. The TS risk signal, TS dependency edges, and TS review rationale remain. More backend facts make the report more backend-first, but still PR-ready. |
| Was the suggested review order useful? | 5 | Improved for mixed changes. Backend config and central Python modules rank before leaf frontend/backend files, while frontend central files still have rationale. |
| Would I paste this report into a PR? | 4 | Yes. PR mode remains compact. Mermaid is still omitted for large graphs, and full details stay in JSON/full mode. |
| Would this help future-me understand the change? | 5 | Yes. Python backend architecture is now visible instead of being only a limitation note. |

Overall average: **4.6 / 5**

Previous scores:

- v0.1.2: **3.4 / 5**
- v0.1.3: **4.1 / 5**
- v0.1.4: **4.0 / 5**
- v0.1.5: **4.4 / 5**

## Concrete issues found in the v0.2.0 report

1. **Python MVP works.** Python files now produce deterministic local import edges and participate in review order/rationale.
2. **Unsupported Python noise is gone.** Python no longer appears in unsupported-language sections when the analyzer is active.
3. **Backend related-test hints are useful.** The report found likely normalization and scoring tests for changed backend services.
4. **PR mode remains acceptable.** The graph is much larger, but PR mode still caps long details and omits Mermaid.
5. **Tradeoff:** the report is now more backend-first, which is correct for this mixed diff but slightly reduces immediate visibility of frontend examples compared with v0.1.5.
6. **Remaining limitation:** Python resolution is heuristic. It should stay honest about dynamic imports, runtime path changes, namespace packages, and FastAPI route intelligence.

## Recommended next improvements

Do not implement these as part of the Python MVP.

1. Add language/folder grouping for large-change risk paths.
2. Label potential related tests by analyzer/language in the report when multiple analyzers produce evidence.
3. Add source-to-test import-edge matching for Python tests that import changed source modules.
4. Improve Python source-root detection only through dogfood-proven cases, not a broad package-resolution rewrite.
5. Keep plugin/framework extraction deferred until the Python analyzer has been dogfooded further.

## Decision

**Decision: continue. v0.2.0 meets the Python Analyzer MVP goal and improves AIJobRadar dogfood from 4.4 / 5 to 4.6 / 5 while preserving a 4 / 5 PR paste score.**

ArchLens now handles the main mixed FastAPI/Python + React use case better: Python files feed deterministic import edges into the same language-neutral graph as TypeScript/JavaScript, and likely backend tests are surfaced without adding AI, a plugin framework, or product-surface expansion.
