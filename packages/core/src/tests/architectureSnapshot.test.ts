import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createArchitectureSnapshot } from "../architectureSnapshot.js";

const fixtureRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures/sample");

describe("createArchitectureSnapshot", () => {
  it("creates file nodes and import edges", () => {
    const snapshot = createArchitectureSnapshot(fixtureRoot, new Date("2026-01-01T00:00:00.000Z"));
    expect(snapshot.nodes.map((node) => node.path)).toContain("src/app/main.ts");
    expect(snapshot.nodes.map((node) => node.path)).toContain("src/core/math.ts");
    expect(snapshot.edges).toContainEqual({
      from: "src/app/main.ts",
      to: "src/core/math.ts",
      kind: "import",
      sourcePath: "src/app/main.ts",
    });
    expect(snapshot.stats.nodeCount).toBeGreaterThanOrEqual(3);
    expect(snapshot.stats.edgeCount).toBeGreaterThanOrEqual(1);
  });
});
