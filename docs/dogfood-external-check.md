# External Dogfood Check — AIJobRadar with ArchLens v0.1.4

Date: 2026-06-08

## Candidate repo inspection

This rerun uses the same real Yuri project and same git diff as the v0.1.2/v0.1.3 dogfood checks so the v0.1.4 language-neutral scope changes can be compared directly.

| Repo | Exists locally | Primary language/framework | Current ArchLens fit | Recent meaningful diff/commit |
| --- | --- | --- | --- | --- |
| `AIJobRadar` | Yes: `/home/yuri/Desktop/projects/AIJobRadar` | FastAPI/Python backend plus React 19 + Vite TypeScript frontend | Strong for TypeScript/React architecture facts; Python files are now surfaced as unsupported source facts, but Python imports/tests are not analyzed | Yes. `HEAD~1..HEAD` (`be06dc5..aeca9b8`) is a large feature commit adding React routes/components, Tailwind config, package changes, and backend scoring/provider changes. |
| `review-insight-tool` | Yes: `/home/yuri/Desktop/projects/review-insight-tool` | FastAPI/Python backend plus Next.js/React TypeScript frontend | Good frontend fit, but the latest commit is not architecture-significant | Latest `HEAD~1..HEAD` only changes `.gitignore`; older meaningful commits are less focused than AIJobRadar's latest feature commit. |
| `AgentForge` | Yes: `/home/yuri/Desktop/projects/AgentForge` | Mostly Python generator/backend, with JS/TS templates/examples | Weak for current v0.1.x because meaningful recent commits are Python-heavy | Recent meaningful commits exist, but they are mostly Python generator/test changes. |

## Selected repo

Selected: `AIJobRadar`

Base/head used:

- Base: `HEAD~1` = `be06dc5c50fb961106e72ca8087f1d1f1bb2fd5e`
- Head: `HEAD` = `aeca9b8c67ed500a8de55b5bad954eb34ed791e7`

Why selected:

- It remains the best direct comparison target from the previous dogfood runs.
- It exercises both the dogfood-proven TypeScript/React report quality and the new v0.1.4 language-neutral/unsupported-language wording.
- The mixed FastAPI/Python + React shape is strategically important for ArchLens's future Python analyzer direction.

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

Snapshot/diff observed counts with v0.1.4:

- Snapshot nodes: 134
- Snapshot edges: 18
- Snapshot nodes from `.venv/`: 0
- Snapshot nodes from `.archlens/`: 0
- Python source/config facts surfaced: 91
- Active analyzer metadata entries: 1 (`typescript-javascript`)
- Added files/modules: 19
- Changed files/modules: 22
- Added dependency edges: 18
- Removed dependency edges: 2
- Risk signals: 5

Comparison across dogfood runs:

| Version | Snapshot nodes | `.venv/` nodes | Python facts surfaced | Overall usefulness |
| --- | ---: | ---: | ---: | ---: |
| v0.1.2 | 319 | 264 | Mostly incidental/noisy | 3.4 / 5 |
| v0.1.3 | 54 | 0 | Not scanned as source facts | 4.1 / 5 |
| v0.1.4 | 134 | 0 | 91 unsupported Python facts | 4.0 / 5 |

v0.1.4 is more honest and language-neutral, but slightly noisier than v0.1.3 because unsupported Python files are now surfaced explicitly.

## Excerpt from generated architecture-impact report

```markdown
## Analyzer scope

- ArchLens analyzed TypeScript/JavaScript architecture facts in this repository.
- Active analyzer metadata: `typescript-javascript`.
- Python files changed, but Python dependency analysis is not supported in this version.

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

- Unsupported language areas are listed as scope limitations, not as no-risk areas.
- Related-test inference is unavailable for these changed non-TypeScript/JavaScript paths in v0.1:
  - `backend/src/ai_job_radar/application/services/score_jobs.py`
  - `backend/src/ai_job_radar/infrastructure/providers/linkedin_scraper/provider.py`
  - `backend/src/ai_job_radar/interfaces/api/routers/jobs.py`
```

Suggested review order began with config/package files, then central TypeScript dependencies:

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
```

## Evaluation checklist

Scores are 1–5, where 1 is poor and 5 is excellent.

| Checklist item | Score | Notes |
| --- | ---: | --- |
| Did ArchLens detect real structural changes? | 4 | Yes for TypeScript/React architecture, and v0.1.4 now also surfaces changed Python files as source/config facts. It still does not analyze Python dependency structure, which is stated clearly. |
| Did it identify useful dependency edges? | 5 | Yes for the TS/React surface. The edges clearly show `main.tsx -> routes/*`, routes depending on `api.ts` and `JobCard`, and `JobCard` composing smaller components. |
| Did the risk signals feel specific rather than generic? | 4 | Mostly. Analyzer scope and unsupported-language signals are honest and useful. The source-without-tests signal is now noisier because it includes unsupported Python source files as well as TS files. |
| Was the suggested review order useful? | 4 | Yes. Config/package files appear first, then central TS dependencies (`JobCard`, `types.ts`, `api.ts`) before route leaves. Unsupported Python files appear after the TS architecture-relevant set. |
| Did it detect changed or potential related tests? | 3 | It clearly separates no changed tests, no TS/JS related tests found, and Python inference unavailable. It still cannot identify existing Python tests that likely relate to backend changes. |
| Would I paste this report into a PR? | 3 | I would paste an excerpt. The analyzer scope and architecture story are PR-ready, but the full report is long because it lists many unsupported Python paths. |
| Would this help future-me understand the change? | 5 | Yes. It explains both the frontend architectural restructuring and the fact that backend Python changed outside current analyzer scope. |

Overall average: **4.0 / 5**

Previous scores:

- v0.1.2: **3.4 / 5**
- v0.1.3: **4.1 / 5**

Interpretation: v0.1.4 is slightly less compact than v0.1.3 on this mixed repo, but it is strategically better because it no longer implies ArchLens is TypeScript-only or silently ignores Python change areas.

## Concrete issues found in the updated v0.1.4 report

1. **Analyzer metadata works.** `.archlens/snapshot.json` includes the `typescript-javascript` analyzer with languages, extensions, capabilities, and limitations.
2. **Default ignores remain fixed.** `.venv/` and `.archlens/` contributed 0 snapshot nodes.
3. **Python unsupported scope is now honest.** The report says Python files changed but Python dependency analysis is unsupported.
4. **Python facts increase report length.** Added/changed counts rose from v0.1.3 because Python files are now surfaced as source facts. This is honest but makes the report less compact.
5. **Source-without-tests signal is too broad for unsupported languages.** It includes Python files even though Python related-test inference is unavailable. The tests section clarifies this, but the risk signal itself could be better scoped or split.
6. **Related Python tests remain invisible.** The repo has backend tests, but v0.1.4 correctly does not infer relationships for Python yet.
7. **Frontend architecture quality is preserved.** Architecture story, dependency edges, and review order are not degraded for the TS/React change.

## Recommended next improvements

Do not implement these as part of this dogfood rerun.

1. Split `source changed without tests` into analyzer-supported and unsupported-language variants so unsupported Python files do not make the TS/JS test signal noisy.
2. Add a compact unsupported-language summary when many Python paths changed, with an expandable/detail section or capped list.
3. Keep Python analyzer MVP as the next language-support milestone, focused on deterministic imports and test heuristics only.
4. Add review-order rationale for central files, for example: `frontend/src/api.ts` ranked early because it is imported by 3 changed route modules.
5. Consider grouping package/config files with suggested verification commands to make the PR excerpt shorter.

## Decision

**Decision: continue. v0.1.4 is better aligned with the language-agnostic product direction and remains useful for limited real PR dogfood on TypeScript/React changes.**

ArchLens remains actually useful on AIJobRadar for frontend architecture review. v0.1.4 adds important honesty about analyzer scope and mixed-language limitations. The main tradeoff is verbosity: surfacing unsupported Python files is strategically correct, but future reports should summarize unsupported-language areas more compactly.
