# Language Support

ArchLens is intended to be language-agnostic. v0.2.0 supports TypeScript/JavaScript plus a Python analyzer MVP while keeping the shared architecture graph and report format language-neutral.

## Current analyzers

Active analyzer metadata written to snapshots:

- `typescript-javascript`
- `python`

## TypeScript/JavaScript support

Supported file forms:

- TypeScript (`.ts`)
- JavaScript (`.js`)
- TSX (`.tsx`)
- JSX (`.jsx`)
- ECMAScript modules (`.mjs`)
- CommonJS modules (`.cjs`)

Capabilities:

- static import/export detection;
- simple `require("...")` detection;
- string-literal `import("...")` dynamic import detection;
- relative import resolution where practical;
- TypeScript/JavaScript test-path heuristics.

Limitations:

- TypeScript path aliases may be unresolved.
- Non-relative package/workspace imports may be unresolved.
- Dynamic import expressions are not resolved.
- There is no deep symbol graph or call graph.

## Python MVP support

Supported file form:

- Python (`.py`)

Capabilities:

- common static `import package.module` detection;
- `import package.module as alias` detection;
- `from package.module import name` detection;
- basic `from .module import name` and `from ..package.module import name` detection;
- basic local module resolution to `module/path.py` and `module/path/__init__.py`;
- common source-root heuristics for repo root, `backend/src`, `src`, and discovered Python package roots;
- Python related-test path heuristics such as `test_*.py`, `*_test.py`, and `tests/` layouts.

Limitations:

- dynamic imports are not resolved;
- runtime imports and `sys.path` mutation are not resolved;
- no type analysis;
- no symbol or call graph;
- namespace package resolution is limited;
- FastAPI-specific route analysis is not implemented.

The Python analyzer is an MVP. It feeds deterministic local import edges and test heuristics into the same ArchLens graph as TypeScript/JavaScript facts; it is not a full Python static analysis platform.

## Unsupported language detection

ArchLens can still list changed/scanned files with known unsupported extensions, including:

- `.go`
- `.java`
- `.cs`
- `.rb`
- `.php`

These files are not dependency-analyzed yet. They are surfaced so reports can say that dependency analysis and related-test inference are unavailable for those languages.

## Future support

Planned direction:

1. **Stabilize Python MVP through dogfood** — improve deterministic import/test heuristics only where they help real reviews without adding runtime analysis.
2. **Formal analyzer interface** — introduce an adapter/plugin-like boundary only after the TypeScript/JavaScript and Python analyzers prove the core graph requirements.
3. **Additional analyzers** — consider Go, Java, and other ecosystems after the core graph and Python analyzer prove the model.

Do not treat any current analyzer as the product boundary. Each analyzer feeds the language-neutral ArchLens core.
