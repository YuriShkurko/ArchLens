# External Dogfood Check — AIJobRadar with ArchLens v0.1.5

Date: 2026-06-08

## Candidate repo inspection

This rerun uses the same real Yuri project and same git diff as the v0.1.2–v0.1.4 dogfood checks so the v0.1.5 PR-readiness changes can be compared directly.

| Repo | Exists locally | Primary language/framework | Current ArchLens fit | Recent meaningful diff/commit |
| --- | --- | --- | --- | --- |
| `AIJobRadar` | Yes: `/home/yuri/Desktop/projects/AIJobRadar` | FastAPI/Python backend plus React 19 + Vite TypeScript frontend | Strong for TypeScript/React architecture facts; Python files are surfaced as unsupported source facts, but Python imports/tests are not analyzed | Yes. `HEAD~1..HEAD` (`be06dc5..aeca9b8`) is a large feature commit adding React routes/components, Tailwind config, package changes, and backend scoring/provider changes. |
| `review-insight-tool` | Yes: `/home/yuri/Desktop/projects/review-insight-tool` | FastAPI/Python backend plus Next.js/React TypeScript frontend | Good frontend fit, but the latest commit is not architecture-significant | Latest `HEAD~1..HEAD` only changes `.gitignore`; older meaningful commits are less focused than AIJobRadar's latest feature commit. |
| `AgentForge` | Yes: `/home/yuri/Desktop/projects/AgentForge` | Mostly Python generator/backend, with JS/TS templates/examples | Weak for current v0.1.x because meaningful recent commits are Python-heavy | Recent meaningful commits exist, but they are mostly Python generator/test changes. |

## Selected repo

Selected: `AIJobRadar`

Base/head used:

- Base: `HEAD~1` = `be06dc5c50fb961106e72ca8087f1d1f1bb2fd5e`
- Head: `HEAD` = `aeca9b8c67ed500a8de55b5bad954eb34ed791e7`

Why selected:

- It remains the best direct comparison target from previous dogfood runs.
- It exercises dogfood-proven TypeScript/React reporting and the mixed-language unsupported-Python scope introduced in v0.1.4.
- v0.1.5 specifically targeted the v0.1.4 weakness: the full report was honest but too long to paste into a PR.

Pre-existing target repo status note: `AIJobRadar` already had unrelated untracked local files/directories before this rerun (`ai-job-radar/`, `docker-compose.scribe.yml`, `docker/`, `scribe-docker-global.sh`, `scribe-docker-local.sh`). I did not modify those.

## Commands run

From `/home/yuri/Desktop/projects/ArchLens`:

```bash
pnpm typecheck
pnpm build
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

Final ArchLens verification commands from `/home/yuri/Desktop/projects/ArchLens`:

```bash
pnpm typecheck
pnpm build
pnpm test
```

## Command results

All dogfood commands succeeded.

Observed output:

```text
Wrote /home/yuri/Desktop/projects/AIJobRadar/.archlens/snapshot.json
Wrote /home/yuri/Desktop/projects/AIJobRadar/.archlens/architecture-diff.json
Wrote /home/yuri/Desktop/projects/AIJobRadar/.archlens/architecture-impact.md
```

Snapshot/diff observed counts with v0.1.5:

- Snapshot nodes: 134
- Snapshot edges: 18
- Snapshot nodes from `.venv/`: 0
- Snapshot nodes from `.archlens/`: 0
- Python source/config facts surfaced: 91
- Unsupported Python files changed in diff: 23
- Active analyzer metadata entries: 1 (`typescript-javascript`)
- Added files/modules: 19
- Changed files/modules: 22
- Added dependency edges: 18
- Removed dependency edges: 2
- Risk signals: 5

Risk signal split observed:

- `supported-source-changed-without-tests`: 11 paths
- `unsupported-source-changed-test-inference-unavailable`: 22 paths
- `config-or-workflow-changed`: 5 paths
- `dependency-edges-added`: 11 paths
- `oversized-architecture-change`: 41 paths

Comparison across dogfood runs:

| Version | Snapshot nodes | `.venv/` nodes | Unsupported/Python handling | Overall usefulness | PR paste score |
| --- | ---: | ---: | --- | ---: | ---: |
| v0.1.2 | 319 | 264 | Mostly incidental/noisy | 3.4 / 5 | 3 / 5 |
| v0.1.3 | 54 | 0 | Not scanned as source facts | 4.1 / 5 | 4 / 5 |
| v0.1.4 | 134 | 0 | Honest but verbose unsupported Python lists | 4.0 / 5 | 3 / 5 |
| v0.1.5 | 134 | 0 | Honest compact unsupported Python summaries | 4.4 / 5 | 4 / 5 |

## Excerpt from generated PR-mode architecture-impact report

```markdown
## Analyzer scope

- ArchLens analyzed TypeScript/JavaScript architecture facts in this repository.
- Active analyzer metadata: `typescript-javascript`.
- Unsupported Python files changed: 23. Python dependency analysis is not supported in this version.
- Unsupported language areas are scope limitations, not no-risk areas.

## Architecture story

- A previous App.tsx dependency was removed.
- Entrypoint now imports route modules.
- JobCard.tsx composes smaller UI components.
- JobCard.tsx is now shared by route modules.

## Package/config verification

- Package/config/workflow/deployment files changed.
- Verify install/build/test/runtime commands that depend on these files.
- Key files: 5
  - Examples: `backend/src/ai_job_radar/config/settings.py`, `frontend/package-lock.json`, `frontend/package.json`, `frontend/postcss.config.js`, `frontend/tailwind.config.ts`

## Key risks

- **WARNING — Supported source changed without a changed test file** (test-coverage-proxy)
  - Analyzed TypeScript/JavaScript source changed with no test files changed in the same diff.
- **INFO — Unsupported source changed; related-test inference unavailable** (unsupported-language)
  - Source files in languages without an active analyzer changed.
```

Tests excerpt:

```markdown
### Unsupported related-test inference

- Unsupported language areas are listed as scope limitations, not as no-risk areas.
- Python files changed: 23
  - Python dependency analysis: not supported in this version.
  - Python related-test inference: not supported in this version.
- Example paths: `backend/alembic/versions/20260417_0003_user_decisions.py`, `backend/alembic/versions/20260423_0004_easy_apply_flag.py`, `backend/src/ai_job_radar/application/dto/normalized_job.py`, `backend/src/ai_job_radar/application/services/normalize_jobs.py`, `backend/src/ai_job_radar/application/services/notify_jobs.py` (+18 more)
- Full unsupported-path details are available in `.archlens/architecture-diff.json` or `--mode full`.
```

Suggested review order and rationale excerpt:

```markdown
- `backend/src/ai_job_radar/config/settings.py`
- `frontend/package-lock.json`
- `frontend/package.json`
- `frontend/postcss.config.js`
- `frontend/tailwind.config.ts`
- `frontend/src/components/JobCard.tsx`
- `frontend/src/types.ts`
- `frontend/src/api.ts`
- `frontend/src/main.tsx`
- `frontend/src/routes/CardPage.tsx`

### Review-order rationale

- `frontend/src/types.ts` ranked early because it is imported by 3 changed route modules.
- `frontend/src/api.ts` ranked early because it is imported by 3 changed route modules.
- `frontend/src/components/JobCard.tsx` ranked early because it is imported by 3 changed route modules.
```

Mermaid PR-mode behavior:

```markdown
## Appendix: Mermaid dependency diagram

- Diagram omitted in PR mode because 18 new dependency edges would dominate the report.
- Run `archlens render --mode full` for the full Mermaid diagram.
```

## Evaluation checklist

Scores are 1–5, where 1 is poor and 5 is excellent.

| Checklist item | Score | Notes |
| --- | ---: | --- |
| Did ArchLens detect real structural changes? | 4 | Yes for TypeScript/React architecture, and v0.1.5 still surfaces changed Python files as unsupported source/config facts without pretending to analyze them. |
| Did it identify useful dependency edges? | 5 | Yes. The TS/React dependency edges remain clear and are not degraded by PR mode. Full details remain available through JSON/full mode. |
| Did the risk signals feel specific rather than generic? | 4 | Improved. The no-test risk is split between supported TS/JS paths and unsupported-language test inference, so Python paths no longer pollute the TS/JS test warning. |
| Was the suggested review order useful? | 5 | Improved. It still ranks config/package files first and central TS dependencies before routes, and now explains why `api.ts`, `types.ts`, and `JobCard.tsx` were ranked early. |
| Did it detect changed or potential related tests? | 4 | Improved wording and scoping. It clearly says no changed tests, no TS/JS related tests found, and Python related-test inference unavailable. It still cannot identify Python tests yet, by design. |
| Would I paste this report into a PR? | 4 | Yes. PR mode is compact enough to paste with little editing. Long Python path lists and Mermaid are summarized or moved to full mode. |
| Would this help future-me understand the change? | 5 | Yes. The architecture story, centrality rationale, config verification note, and scope limitations together explain the useful review path. |

Overall average: **4.4 / 5**

Previous scores:

- v0.1.2: **3.4 / 5**
- v0.1.3: **4.1 / 5**
- v0.1.4: **4.0 / 5**

## Concrete issues found in the updated v0.1.5 report

1. **PR mode fixed the biggest v0.1.4 pain.** Unsupported Python paths are summarized with counts and examples instead of dominating the top report.
2. **Full mode preserves detail.** `render --mode full` remains available for complete facts and the full Mermaid diagram.
3. **Risk split is better.** Supported TS/JS no-test paths are separate from unsupported-language test inference.
4. **Review rationale is useful.** Central files are not only ranked early; the report says why.
5. **Mermaid is no longer intrusive.** PR mode omits the long diagram and points to full mode.
6. **Key detected facts are more PR-ready.** Examples now prioritize analyzed TS/JS facts before unsupported Python examples.
7. **Remaining limitation:** the large-change risk still cites all changed files in compact form, including unsupported Python paths. It is acceptable but could eventually summarize by language/folder.

## Recommended next improvements

Do not implement these as part of this dogfood rerun.

1. Add optional grouping for large-change risk by language/folder to make broad mixed-repo changes easier to scan.
2. Add review-order rationale for config/package files, e.g. which command each file likely affects, while keeping it deterministic.
3. Keep Python analyzer MVP as the next language-support milestone, focused only on deterministic imports and test heuristics.
4. Consider letting PR mode cap the number of risk bullets when many independent signals exist, with full mode retaining all.
5. Consider outputting both `architecture-impact.pr.md` and `architecture-impact.full.md` if users frequently want both artifacts.

## Decision

**Decision: continue. v0.1.5 achieves the PR-readiness goal and should be the baseline before starting Python support.**

ArchLens remains actually useful on AIJobRadar for frontend architecture review. v0.1.5 preserves language-neutral honesty from v0.1.4 while making the default report compact enough to paste into a real PR. Python support should remain a future analyzer milestone, not part of this PR-readiness polish pass.
