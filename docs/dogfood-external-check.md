# External Dogfood Check — AIJobRadar after v0.1.3 report-quality pass

Date: 2026-06-08

## Candidate repo inspection

The original external dogfood selection was repeated against the same real Yuri project so the v0.1.3 report-quality changes could be compared directly with the v0.1.2 findings.

| Repo | Exists locally | Primary language/framework | Current ArchLens TS/JS fit | Recent meaningful diff/commit |
| --- | --- | --- | --- | --- |
| `AIJobRadar` | Yes: `/home/yuri/Desktop/projects/AIJobRadar` | FastAPI/Python backend plus React 19 + Vite TypeScript frontend | Good for frontend architecture; Python backend files are listed/classified but Python imports remain unsupported by design in v0.1.3 | Yes. `HEAD~1..HEAD` (`be06dc5..aeca9b8`) is a large feature commit that adds React routes/components, Tailwind config, package changes, and backend scoring/provider changes. |
| `review-insight-tool` | Yes: `/home/yuri/Desktop/projects/review-insight-tool` | FastAPI/Python backend plus Next.js/React TypeScript frontend | Good for frontend, but the latest commit is not architecture-significant | Latest `HEAD~1..HEAD` only changes `.gitignore`; older meaningful commits are less TS-architecture focused than AIJobRadar's latest feature commit. |
| `AgentForge` | Yes: `/home/yuri/Desktop/projects/AgentForge` | Mostly Python generator/backend, with JS/TS templates/examples | Weak for the recent meaningful commits because they are primarily Python generator/test changes | Recent meaningful commits exist, but the current changed surfaces are Python-heavy for ArchLens v0.1.x. |

## Selected repo

Selected: `AIJobRadar`

Base/head used:

- Base: `HEAD~1` = `be06dc5c50fb961106e72ca8087f1d1f1bb2fd5e`
- Head: `HEAD` = `aeca9b8c67ed500a8de55b5bad954eb34ed791e7`

Why selected:

- It is still the best local candidate for TypeScript/React architecture analysis.
- The commit contains the exact frontend decomposition that exposed v0.1.2 report-quality gaps: route modules, shared components, shared `api.ts`, config/package changes, and no changed frontend tests.
- Reusing the same diff makes the v0.1.3 improvements measurable instead of changing both the tool and the test case.

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
node ../ArchLens/apps/cli/dist/index.js render
```

Generated files inspected in the target repo:

- `.archlens/snapshot.json`
- `.archlens/architecture-diff.json`
- `.archlens/architecture-impact.md`

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

Snapshot/diff observed counts after v0.1.3:

- Snapshot nodes: 54
- Snapshot edges: 18
- Snapshot nodes from `.venv/`: 0
- Snapshot nodes from `.archlens/`: 0
- Added files/modules: 12
- Changed files/modules: 7
- Added dependency edges: 18
- Removed dependency edges: 2
- Risk signals: 5

Comparison to v0.1.2 dogfood:

- v0.1.2 snapshot nodes: 319
- v0.1.2 `.venv/` nodes: 264
- v0.1.3 snapshot nodes: 54
- v0.1.3 `.venv/` nodes: 0

The default ignore fix clearly removed the largest source of noise.

## Excerpt from generated architecture-impact report

```markdown
## Architecture story

- A previous App.tsx dependency was removed.
- Entrypoint now imports route modules.
- JobCard.tsx composes smaller UI components.
- JobCard.tsx is now shared by route modules.

## Tests

### Changed test files

- None detected.

### Potential related existing tests

- No related existing tests found by TypeScript/JavaScript path heuristics.

### Unsupported related-test inference

- Related-test inference is unavailable for these changed non-TypeScript/JavaScript paths in v0.1:
  - `backend/src/ai_job_radar/config/settings.py`

## Suggested review order

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
- `frontend/src/routes/DevPanel.tsx`
- `frontend/src/routes/Triage.tsx`
```

## Evaluation checklist

Scores are 1–5, where 1 is poor and 5 is excellent.

| Checklist item | Score | Notes |
| --- | ---: | --- |
| Did ArchLens detect real structural changes? | 4 | Yes. It still correctly detected the frontend split from `App.tsx` into route modules and shared UI components. Python backend architecture remains intentionally unsupported. |
| Did it identify useful dependency edges? | 5 | Yes. The added edges clearly show `main.tsx -> routes/*`, routes depending on `api.ts` and `JobCard`, and `JobCard` composing smaller components. |
| Did the risk signals feel specific rather than generic? | 4 | Improved. The config/package signal says what to verify, the new-edge signal explains shared-dependency centrality, and unsupported-language areas are explicit. Large-change is still heuristic but more actionable. |
| Was the suggested review order useful? | 4 | Improved. High-risk config/package files remain first, and shared dependencies such as `frontend/src/api.ts`, `frontend/src/types.ts`, and `JobCard.tsx` now appear before route leaf modules. |
| Did it detect changed or potential related tests? | 3 | Improved wording. It clearly says there were no changed tests, no related TS/JS tests found, and Python related-test inference is unavailable. It still cannot connect backend Python changes to backend tests. |
| Would I paste this report into a PR? | 4 | Yes, with little editing. The top half is now PR-useful, especially the architecture story and review order. The Mermaid diagram is still long for a PR comment. |
| Would this help future-me understand the change? | 5 | Yes. The deterministic architecture story now states the core frontend restructuring that v0.1.2 only implied. |

Overall average: **4.1 / 5**

Previous v0.1.2 score: **3.4 / 5**

## Concrete issues found in the updated report

1. **Default ignore handling is fixed for this case.** `.venv/` disappeared from the snapshot, reducing nodes from 319 to 54.
2. **The architecture story is useful and factual.** It captured the important frontend change without inventing intent.
3. **Review order is materially better.** `frontend/src/api.ts` no longer appears at the end; shared dependencies are reviewed before route leaf modules.
4. **Unsupported Python scope is clearer.** The report now explicitly says Python related-test inference is unavailable instead of silently implying there are no related backend tests.
5. **Remaining mixed-repo limitation is still real.** Backend Python changes are still only file facts/risk paths, not dependency-aware architecture impact.
6. **The Mermaid diagram may still be too large for PR paste.** It is accurate, but a long edge diagram can dominate a review comment.
7. **Package-lock and package config are surfaced early, but not grouped.** The order is reasonable, but a future report could group package/config files under a compact verification note.

## Recommended next improvements

Do not implement these as part of this dogfood rerun.

1. Add an option or renderer behavior to collapse or summarize large Mermaid diagrams in PR-ready Markdown.
2. Improve package/config presentation by grouping `package.json`, lockfiles, PostCSS/Tailwind config, and suggested verification commands.
3. Improve frontend test inventory wording when no TS/JS tests exist in the scanned frontend, separate from "no related tests found."
4. Consider Python import/test support later if mixed FastAPI + React repos become a target, but do not add it to v0.1.3.
5. Consider reporting why a shared dependency was ranked early, e.g. "imported by 3 changed route modules," to make review-order centrality auditable.

## Decision

**Decision: continue. v0.1.3 report quality is meaningfully better and now good enough for limited real PR dogfood on TypeScript/React changes.**

ArchLens is actually useful on the AIJobRadar external repo for frontend architecture review. The v0.1.3 changes fixed the biggest noise issue, made the report more PR-ready, and turned implied structure into a readable architecture story. Remaining limitations are mostly known scope boundaries rather than blockers for TypeScript/React dogfood.
