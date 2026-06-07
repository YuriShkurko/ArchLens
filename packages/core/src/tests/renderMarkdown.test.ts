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
      changedNodes: [],
      addedEdges: [{ from: "src/a.ts", to: "src/b.ts", kind: "import", sourcePath: "src/a.ts" }],
      removedEdges: [],
      riskSignals: [{ id: "r1", title: "Risk", level: "warning", kind: "dependency-boundary", paths: ["src/a.ts"], detail: "detail" }],
      reviewOrder: ["src/a.ts", "src/b.ts"],
      changedTestFiles: [],
      potentialRelatedTests: ["src/b.test.ts"],
      stats: { addedNodeCount: 1, removedNodeCount: 0, changedNodeCount: 0, addedEdgeCount: 1, removedEdgeCount: 0 },
    };
    const md = renderMarkdown(diff, { authorNote: "Author says this is extraction work." });
    expect(md).toContain("## Detected facts");
    expect(md).toContain("## Inferred risk signals");
    expect(md).toContain("## Author-provided context");
    expect(md).toContain("## Unknowns");
    expect(md).toContain("### Changed test files");
    expect(md).toContain("### Potential related existing tests");
    expect(md).toContain("```mermaid");
    expect(md).toContain("Author says this is extraction work.");
  });
});
