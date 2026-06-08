import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
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
    expect(snapshot.analyzers.map((analyzer) => analyzer.name)).toEqual(["typescript-javascript", "python"]);
  });

  it("includes Python nodes, resolved Python edges, and Python analyzer metadata", () => {
    const root = mkdtempSync(path.join(tmpdir(), "archlens-python-snapshot-"));
    try {
      mkdirSync(path.join(root, "backend/src/ai_job_radar/config"), { recursive: true });
      mkdirSync(path.join(root, "backend/src/ai_job_radar/application/services"), { recursive: true });
      writeFileSync(path.join(root, "backend/src/ai_job_radar/__init__.py"), "");
      writeFileSync(path.join(root, "backend/src/ai_job_radar/config/settings.py"), "class Settings: pass\n");
      writeFileSync(path.join(root, "backend/src/ai_job_radar/application/services/score_jobs.py"), "from ai_job_radar.config.settings import Settings\n");

      const snapshot = createArchitectureSnapshot(root, new Date("2026-01-01T00:00:00.000Z"));
      expect(snapshot.nodes).toContainEqual(expect.objectContaining({ path: "backend/src/ai_job_radar/application/services/score_jobs.py", kind: "source", language: "python" }));
      expect(snapshot.edges).toContainEqual(expect.objectContaining({ from: "backend/src/ai_job_radar/application/services/score_jobs.py", to: "backend/src/ai_job_radar/config/settings.py", kind: "import" }));
      expect(snapshot.analyzers).toContainEqual(expect.objectContaining({ name: "python", languages: ["python"], fileExtensions: [".py"] }));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("ignores generated and local environment directories by default", () => {
    const root = mkdtempSync(path.join(tmpdir(), "archlens-ignore-"));
    try {
      mkdirSync(path.join(root, "src"), { recursive: true });
      writeFileSync(path.join(root, "src", "main.ts"), "export const ok = true;\n");
      for (const ignored of [".git", ".venv", "venv", "env", "node_modules", "dist", "build", ".next", ".turbo", ".cache", "coverage", ".pytest_cache", "__pycache__", ".archlens"]) {
        mkdirSync(path.join(root, ignored), { recursive: true });
        writeFileSync(path.join(root, ignored, "noise.ts"), "export const noisy = true;\n");
      }

      const snapshot = createArchitectureSnapshot(root, new Date("2026-01-01T00:00:00.000Z"));
      expect(snapshot.nodes.map((node) => node.path)).toEqual(["src/main.ts"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
