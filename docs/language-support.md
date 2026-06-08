# Language Support

ArchLens is intended to be language-agnostic. v0.1.x supports TypeScript/JavaScript first while the shared architecture graph and report format stabilize.

## Current support

The current analyzer is `typescript-javascript`.

Supported languages and file forms:

- TypeScript (`.ts`)
- JavaScript (`.js`)
- TSX (`.tsx`)
- JSX (`.jsx`)
- ECMAScript modules (`.mjs`)
- CommonJS modules (`.cjs`)

## Current capabilities

- static import/export detection;
- simple `require("...")` detection;
- string-literal `import("...")` dynamic import detection;
- relative import resolution where practical;
- TypeScript/JavaScript test-path heuristics.

Analyzer metadata is written to snapshots so reports can say what was actually analyzed.

## Current limitations

- Python imports are not analyzed yet.
- Go, Java, C#, Ruby, and PHP imports are not analyzed yet.
- TypeScript path aliases may be unresolved.
- Non-relative package/workspace imports may be unresolved.
- Dynamic imports are only detected when the specifier is a string literal.
- There is no deep symbol graph or call graph.
- Risk signals are deterministic heuristics, not proof of bugs.

Unsupported language areas are listed as scope limitations, not as no-risk areas.

## Unsupported language detection

ArchLens v0.1.x can list changed/scanned files with known unsupported extensions, including:

- `.py`
- `.go`
- `.java`
- `.cs`
- `.rb`
- `.php`

These files are not dependency-analyzed yet. They are surfaced so the report can say, for example, that Python files changed but Python dependency analysis and related-test inference are unavailable in this version.

## Future support

Planned direction:

1. **Python analyzer MVP** — add deterministic Python import and test heuristics for common FastAPI/Python + React repositories.
2. **Formal analyzer interface** — introduce an adapter/plugin-like boundary only after at least two analyzers exist and the core graph requirements are clearer.
3. **Additional analyzers** — consider Go, Java, and other ecosystems after the core graph and Python analyzer prove the model.

Do not treat the current TypeScript/JavaScript analyzer as the product boundary. It is the first analyzer feeding the language-neutral ArchLens core.
