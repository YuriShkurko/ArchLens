import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { diffArchitectureSnapshots } from "./architectureDiff.js";
import { createArchitectureSnapshot } from "./architectureSnapshot.js";
import { repoRoot, withRefExports } from "./git.js";
import { renderMarkdown, type ReportMode } from "./renderMarkdown.js";
import { ArchitectureDiffSchema, ArchitectureSnapshotSchema, type ArchitectureDiff, type ArchitectureSnapshot } from "./schema.js";

export * from "./schema.js";
export * from "./git.js";
export * from "./scanRepo.js";
export * from "./importScanner.js";
export * from "./architectureSnapshot.js";
export * from "./architectureDiff.js";
export * from "./riskSignals.js";
export * from "./renderMarkdown.js";
export * from "./renderMermaid.js";

export async function writeSnapshot(cwd = process.cwd()): Promise<string> {
  const root = await repoRoot(cwd).catch(() => path.resolve(cwd));
  const snapshot = createArchitectureSnapshot(root);
  const outPath = outputPath(root, "snapshot.json");
  writeJson(outPath, snapshot);
  return outPath;
}

export async function writeDiff(base = "main", head = "HEAD", cwd = process.cwd()): Promise<string> {
  const root = await repoRoot(cwd);
  const diff = await withRefExports(base, head, root, async (baseDir, headDir, baseSha, headSha) => {
    const baseSnapshot = createArchitectureSnapshot(baseDir);
    const headSnapshot = createArchitectureSnapshot(headDir);
    return diffArchitectureSnapshots(baseSnapshot, headSnapshot, baseSha, headSha);
  });
  const outPath = outputPath(root, "architecture-diff.json");
  writeJson(outPath, diff);
  return outPath;
}

export async function writeReport(cwd = process.cwd(), authorNote?: string, mode: ReportMode = "pr"): Promise<string> {
  const root = await repoRoot(cwd).catch(() => path.resolve(cwd));
  const diffPath = outputPath(root, "architecture-diff.json");
  const diff = readArchitectureDiff(diffPath);
  const report = renderMarkdown(diff, { authorNote, mode });
  const outPath = outputPath(root, "architecture-impact.md");
  ensureOutputDir(root);
  writeFileSync(outPath, report, "utf8");
  return outPath;
}

export function readArchitectureSnapshot(filePath: string): ArchitectureSnapshot {
  return ArchitectureSnapshotSchema.parse(JSON.parse(readFileSync(filePath, "utf8")));
}

export function readArchitectureDiff(filePath: string): ArchitectureDiff {
  return ArchitectureDiffSchema.parse(JSON.parse(readFileSync(filePath, "utf8")));
}

export function outputPath(repoRoot: string, fileName: string): string {
  return path.join(repoRoot, ".archlens", fileName);
}

function writeJson(filePath: string, value: unknown) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function ensureOutputDir(root: string) {
  mkdirSync(path.join(root, ".archlens"), { recursive: true });
}
