# ArchLens Roadmap

Small next steps for improving v0.1 without expanding into AI, SaaS, dashboards, GitHub Apps, databases, auth, MCP, or new language support.

## Near-term issues

1. **Dogfood on a real repo**
   - Run ArchLens against AIJobRadar or another real TypeScript/JavaScript repo.
   - Capture confusing report wording and missing risk signals as small issues.

2. **Support tsconfig path aliases**
   - Resolve imports such as `@/core/foo` or workspace aliases from `tsconfig.json`.
   - Keep unresolved imports explicit in the report unknowns.

3. **Improve Mermaid graph readability**
   - Group nodes by folder/package where possible.
   - Keep diagrams useful for small changes and avoid noisy output for large changes.

4. **Detect package-level modules**
   - Summarize changes at package/workspace level in addition to file-level nodes.
   - Preserve file-level facts for reviewer traceability.

5. **Add GitHub Action usage example**
   - Document how to run ArchLens inside CI as a report artifact or PR comment input.
   - Do not build GitHub App behavior yet.

6. **Improve related-test matching**
   - Add more deterministic naming and directory heuristics.
   - Consider source-to-test import edges when tests import changed source modules.
