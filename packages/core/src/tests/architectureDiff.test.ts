import { describe, expect, it } from "vitest";
import { diffArchitectureSnapshots } from "../architectureDiff.js";
import type { ArchitectureSnapshot } from "../schema.js";

function snap(nodes: ArchitectureSnapshot["nodes"], edges: ArchitectureSnapshot["edges"]): ArchitectureSnapshot {
  return {
    version: "0.1",
    createdAt: "2026-01-01T00:00:00.000Z",
    repoRoot: "/tmp/repo",
    nodes,
    edges,
    stats: { nodeCount: nodes.length, edgeCount: edges.length, sourceCount: nodes.filter((n) => n.kind === "source").length, testCount: nodes.filter((n) => n.kind === "test").length, externalImportCount: 0 },
  };
}

describe("diffArchitectureSnapshots", () => {
  it("detects added nodes, changed nodes, edges, and risk", () => {
    const before = snap([
      { id: "src/a.ts", path: "src/a.ts", kind: "source", language: "typescript", riskTags: [], contentHash: "a" },
    ], []);
    const after = snap([
      { id: "src/a.ts", path: "src/a.ts", kind: "source", language: "typescript", riskTags: [], contentHash: "b" },
      { id: "lib/b.ts", path: "lib/b.ts", kind: "source", language: "typescript", riskTags: [], contentHash: "c" },
    ], [{ from: "src/a.ts", to: "lib/b.ts", kind: "import", sourcePath: "src/a.ts" }]);

    const diff = diffArchitectureSnapshots(before, after, "base", "head", new Date("2026-01-01T00:00:00.000Z"));
    expect(diff.addedNodes.map((node) => node.path)).toEqual(["lib/b.ts"]);
    expect(diff.changedNodes.map((node) => node.path)).toEqual(["src/a.ts"]);
    expect(diff.addedEdges).toHaveLength(1);
    expect(diff.reviewOrder.slice(0, 2)).toEqual(["lib/b.ts", "src/a.ts"]);
    expect(diff.riskSignals.map((signal) => signal.id)).toContain("source-without-related-test-change");
    expect(diff.riskSignals.map((signal) => signal.id)).toContain("dependency-edges-added");
    expect(diff.riskSignals.map((signal) => signal.id)).toContain("new-cross-boundary-dependency");
  });

  it("finds potential related existing tests for changed source files", () => {
    const before = snap([
      { id: "packages/core/src/importScanner.ts", path: "packages/core/src/importScanner.ts", kind: "source", language: "typescript", riskTags: [], contentHash: "a" },
      { id: "packages/core/src/tests/importScanner.test.ts", path: "packages/core/src/tests/importScanner.test.ts", kind: "test", language: "typescript", riskTags: [], contentHash: "t" },
    ], []);
    const after = snap([
      { id: "packages/core/src/importScanner.ts", path: "packages/core/src/importScanner.ts", kind: "source", language: "typescript", riskTags: [], contentHash: "b" },
      { id: "packages/core/src/tests/importScanner.test.ts", path: "packages/core/src/tests/importScanner.test.ts", kind: "test", language: "typescript", riskTags: [], contentHash: "t" },
    ], []);

    const diff = diffArchitectureSnapshots(before, after);
    expect(diff.changedTestFiles).toEqual([]);
    expect(diff.potentialRelatedTests).toEqual(["packages/core/src/tests/importScanner.test.ts"]);
  });
});
