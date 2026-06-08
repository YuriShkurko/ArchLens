import { describe, expect, it } from "vitest";
import { diffArchitectureSnapshots } from "../architectureDiff.js";
import type { ArchitectureSnapshot } from "../schema.js";

function snap(nodes: ArchitectureSnapshot["nodes"], edges: ArchitectureSnapshot["edges"]): ArchitectureSnapshot {
  return {
    version: "0.1",
    createdAt: "2026-01-01T00:00:00.000Z",
    repoRoot: "/tmp/repo",
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
    expect(diff.riskSignals.map((signal) => signal.id)).toContain("supported-source-changed-without-tests");
    expect(diff.riskSignals.map((signal) => signal.id)).toContain("dependency-edges-added");
    expect(diff.riskSignals.map((signal) => signal.id)).toContain("new-cross-boundary-dependency");
  });

  it("prioritizes shared dependencies imported by multiple changed modules", () => {
    const before = snap([
      { id: "frontend/src/api.ts", path: "frontend/src/api.ts", kind: "source", language: "typescript", riskTags: [], contentHash: "api" },
      { id: "frontend/src/routes/Old.tsx", path: "frontend/src/routes/Old.tsx", kind: "source", language: "typescript", riskTags: [], contentHash: "old" },
    ], []);
    const after = snap([
      { id: "frontend/src/api.ts", path: "frontend/src/api.ts", kind: "source", language: "typescript", riskTags: [], contentHash: "api" },
      { id: "frontend/src/routes/A.tsx", path: "frontend/src/routes/A.tsx", kind: "source", language: "typescript", riskTags: [], contentHash: "a" },
      { id: "frontend/src/routes/B.tsx", path: "frontend/src/routes/B.tsx", kind: "source", language: "typescript", riskTags: [], contentHash: "b" },
      { id: "frontend/src/routes/C.tsx", path: "frontend/src/routes/C.tsx", kind: "source", language: "typescript", riskTags: [], contentHash: "c" },
    ], [
      { from: "frontend/src/routes/A.tsx", to: "frontend/src/api.ts", kind: "import", sourcePath: "frontend/src/routes/A.tsx" },
      { from: "frontend/src/routes/B.tsx", to: "frontend/src/api.ts", kind: "import", sourcePath: "frontend/src/routes/B.tsx" },
      { from: "frontend/src/routes/C.tsx", to: "frontend/src/api.ts", kind: "import", sourcePath: "frontend/src/routes/C.tsx" },
    ]);

    const diff = diffArchitectureSnapshots(before, after);
    expect(diff.reviewOrder.indexOf("frontend/src/api.ts")).toBeLessThan(diff.reviewOrder.indexOf("frontend/src/routes/A.tsx"));
    expect(diff.reviewRationale).toContain("`frontend/src/api.ts` ranked early because it is imported by 3 changed route modules.");
  });

  it("treats changed Python files as supported and keeps non-Python unsupported language warnings", () => {
    const before = snap([
      { id: "backend/app.py", path: "backend/app.py", kind: "source", language: "python", riskTags: [], contentHash: "a" },
      { id: "service/main.go", path: "service/main.go", kind: "source", language: "go", riskTags: [], contentHash: "go-a" },
    ], []);
    const after = snap([
      { id: "backend/app.py", path: "backend/app.py", kind: "source", language: "python", riskTags: [], contentHash: "b" },
      { id: "service/main.go", path: "service/main.go", kind: "source", language: "go", riskTags: [], contentHash: "go-b" },
    ], []);

    const diff = diffArchitectureSnapshots(before, after);
    expect(diff.riskSignals).toContainEqual(expect.objectContaining({ id: "python-source-changed-without-related-tests", paths: ["backend/app.py"] }));
    expect(diff.riskSignals).toContainEqual(expect.objectContaining({ id: "unsupported-source-changed-test-inference-unavailable", paths: ["service/main.go"] }));
  });

  it("finds potential related existing tests for changed TypeScript source files", () => {
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

  it("finds potential related existing tests for changed Python source files by path heuristic", () => {
    const before = snap([
      { id: "backend/src/ai_job_radar/application/services/score_jobs.py", path: "backend/src/ai_job_radar/application/services/score_jobs.py", kind: "source", language: "python", riskTags: [], contentHash: "a" },
      { id: "backend/tests/application/services/test_score_jobs.py", path: "backend/tests/application/services/test_score_jobs.py", kind: "test", language: "python", riskTags: [], contentHash: "t" },
    ], []);
    const after = snap([
      { id: "backend/src/ai_job_radar/application/services/score_jobs.py", path: "backend/src/ai_job_radar/application/services/score_jobs.py", kind: "source", language: "python", riskTags: [], contentHash: "b" },
      { id: "backend/tests/application/services/test_score_jobs.py", path: "backend/tests/application/services/test_score_jobs.py", kind: "test", language: "python", riskTags: [], contentHash: "t" },
    ], []);

    const diff = diffArchitectureSnapshots(before, after);
    expect(diff.potentialRelatedTests).toEqual(["backend/tests/application/services/test_score_jobs.py"]);
    expect(diff.riskSignals.map((signal) => signal.id)).not.toContain("python-source-changed-without-related-tests");
  });

  it("finds potential related Python tests when a test imports the changed source module", () => {
    const before = snap([
      { id: "backend/src/app/services/score_jobs.py", path: "backend/src/app/services/score_jobs.py", kind: "source", language: "python", riskTags: [], contentHash: "a" },
      { id: "backend/tests/test_scoring.py", path: "backend/tests/test_scoring.py", kind: "test", language: "python", riskTags: [], contentHash: "t" },
    ], [{ from: "backend/tests/test_scoring.py", to: "backend/src/app/services/score_jobs.py", kind: "import", sourcePath: "backend/tests/test_scoring.py" }]);
    const after = snap([
      { id: "backend/src/app/services/score_jobs.py", path: "backend/src/app/services/score_jobs.py", kind: "source", language: "python", riskTags: [], contentHash: "b" },
      { id: "backend/tests/test_scoring.py", path: "backend/tests/test_scoring.py", kind: "test", language: "python", riskTags: [], contentHash: "t" },
    ], [{ from: "backend/tests/test_scoring.py", to: "backend/src/app/services/score_jobs.py", kind: "import", sourcePath: "backend/tests/test_scoring.py" }]);

    const diff = diffArchitectureSnapshots(before, after);
    expect(diff.potentialRelatedTests).toEqual(["backend/tests/test_scoring.py"]);
    expect(diff.riskSignals.map((signal) => signal.id)).not.toContain("python-source-changed-without-related-tests");
  });

  it("explains Python review-order centrality for shared dependencies", () => {
    const before = snap([
      { id: "backend/src/app/config.py", path: "backend/src/app/config.py", kind: "source", language: "python", riskTags: [], contentHash: "config" },
      { id: "backend/src/app/a.py", path: "backend/src/app/a.py", kind: "source", language: "python", riskTags: [], contentHash: "a" },
      { id: "backend/src/app/b.py", path: "backend/src/app/b.py", kind: "source", language: "python", riskTags: [], contentHash: "b" },
    ], []);
    const after = snap([
      { id: "backend/src/app/config.py", path: "backend/src/app/config.py", kind: "source", language: "python", riskTags: [], contentHash: "config" },
      { id: "backend/src/app/a.py", path: "backend/src/app/a.py", kind: "source", language: "python", riskTags: [], contentHash: "a2" },
      { id: "backend/src/app/b.py", path: "backend/src/app/b.py", kind: "source", language: "python", riskTags: [], contentHash: "b2" },
    ], [
      { from: "backend/src/app/a.py", to: "backend/src/app/config.py", kind: "import", sourcePath: "backend/src/app/a.py" },
      { from: "backend/src/app/b.py", to: "backend/src/app/config.py", kind: "import", sourcePath: "backend/src/app/b.py" },
    ]);

    const diff = diffArchitectureSnapshots(before, after);
    expect(diff.reviewOrder.indexOf("backend/src/app/config.py")).toBeLessThan(diff.reviewOrder.indexOf("backend/src/app/a.py"));
    expect(diff.reviewRationale).toContain("`backend/src/app/config.py` ranked early because Python module is imported by 2 changed modules.");
  });
});
