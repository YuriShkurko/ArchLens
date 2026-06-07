# Dogfood Example: GitHub Actions CI Change

This example shows the kind of report ArchLens should produce for a change that adds `.github/workflows/ci.yml` and does not alter TypeScript/JavaScript dependency edges.

# Architecture Impact Report

> ArchLens reports detected structural facts and deterministic architecture-risk signals. It does not infer author intent and is not a PR summary.

## Summary of detected structural changes

- Base: `main`
- Head: `ci-dogfood-example`
- Added files/modules: 1
- Removed files/modules: 0
- Changed files/modules: 0
- Added dependency edges: 0
- Removed dependency edges: 0

## Detected facts

### Added files or modules

- `.github/workflows/ci.yml (workflow, yaml — operations-sensitive)`

### Removed files or modules

- None detected.

### Changed files or modules

- None detected.

### Added dependency edges

- None detected.

### Removed dependency edges

- None detected.

## Inferred risk signals

- **WARNING — Workflow/config/deployment file changed** (operations)
  - Workflow/config files changed. This may affect CI, validation, build, runtime, or release behavior. Verify the relevant workflow or command has run successfully before merge.
  - Paths: `.github/workflows/ci.yml`

## Tests

### Changed test files

- None detected.

### Potential related existing tests

- None detected.

## Suggested review order

Risk-first, deterministic order: high-risk paths, config/workflow/deployment files, dependency-edge participants, changed source, tests, then docs.

- `.github/workflows/ci.yml`

## Mermaid dependency diagram

- No new dependency edges detected, so no dependency-edge diagram was generated.

## Author-provided context

- Dogfood example: adds CI for typecheck, build, and tests.

## Unknowns

- ArchLens does not know author intent.
- ArchLens does not know whether CI, tests, or deployment workflows have passed unless that evidence is provided separately.
- A workflow/config file changed; verify the relevant GitHub Actions run or local validation result before merge.
- TypeScript path aliases and non-relative imports may be unresolved in v0.1.
- Dynamic imports are only detected when the specifier is a string literal.
- Risk signals are deterministic heuristics, not proof of bugs.
