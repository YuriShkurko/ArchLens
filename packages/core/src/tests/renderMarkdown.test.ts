import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../renderMarkdown.js";
import type { ArchitectureDiff } from "../schema.js";

describe("renderMarkdown", () => {
  it("separates facts, inferred risk, author context, unknowns, and Mermaid", () => {
    const diff: ArchitectureDiff = {
      version: "0.1",
      createdAt: "2026-01-01T00:00:00.000Z",
      base: "base",
      head: "head",
      addedNodes: [{ id: "src/b.ts", path: "src/b.ts", kind: "source", language: "typescript", riskTags: [], contentHash: "b" }],
      removedNodes: [],
      changedNodes: [
        { id: "backend/app.py", path: "backend/app.py", kind: "source", language: "python", riskTags: [], contentHash: "py" },
        { id: "service/main.go", path: "service/main.go", kind: "source", language: "go", riskTags: [], contentHash: "go" },
      ],
      addedEdges: [{ from: "src/a.ts", to: "src/b.ts", kind: "import", sourcePath: "src/a.ts" }],
      removedEdges: [],
      analyzers: [
        {
          name: "typescript-javascript",
          languages: ["typescript", "javascript"],
          fileExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
          capabilities: ["static-imports", "exports", "require-string-literals", "dynamic-import-string-literals", "relative-import-resolution", "test-path-heuristics"],
          limitations: ["tsconfig-path-aliases-not-fully-resolved", "dynamic-expressions-not-resolved", "no-symbol-call-graph"],
        },
        {
          name: "python",
          languages: ["python"],
          fileExtensions: [".py"],
          capabilities: ["static-imports", "from-imports", "relative-imports-basic", "local-module-resolution-basic", "test-path-heuristics"],
          limitations: ["dynamic-imports-not-resolved", "runtime-imports-not-resolved", "no-type-analysis", "no-symbol-call-graph", "namespace-package-resolution-limited", "fastapi-route-analysis-not-implemented"],
        },
      ],
      riskSignals: [{ id: "r1", title: "Risk", level: "warning", kind: "dependency-boundary", paths: ["src/a.ts"], detail: "detail" }],
      reviewOrder: ["src/a.ts", "src/b.ts"],
      changedTestFiles: [],
      potentialRelatedTests: [],
      stats: { addedNodeCount: 1, removedNodeCount: 0, changedNodeCount: 0, addedEdgeCount: 1, removedEdgeCount: 0 },
    };
    const md = renderMarkdown(diff, { authorNote: "Author says this is extraction work." });
    expect(md).toContain("## Architecture story");
    expect(md).toContain("## Key detected facts");
    expect(md).toContain("## Key risks");
    expect(md).toContain("## Author-provided context");
    expect(md).toContain("## Appendix: limitations and caveats");
    expect(md).toContain("### Changed test files");
    expect(md).toContain("### Potential related existing tests");
    expect(md).toContain("No related existing tests found by TypeScript/JavaScript path heuristics.");
    expect(md).toContain("### Unsupported related-test inference");
    expect(md).toContain("Unsupported language areas are listed as scope limitations, not as no-risk areas.");
    expect(md).toContain("ArchLens analyzed TypeScript/JavaScript and Python architecture facts in this repository.");
    expect(md).toContain("Python analyzer limitations:");
    expect(md).toContain("Unsupported Go files changed: 1. Go dependency analysis is not supported in this version.");
    expect(md).toContain("service/main.go");
    expect(md).toContain("## Appendix: Mermaid dependency diagram");
    expect(md).toContain("```mermaid");
    expect(md).toContain("Author says this is extraction work.");
  });
});
