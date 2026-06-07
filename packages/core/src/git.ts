import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execa } from "execa";

export async function git(args: string[], cwd: string): Promise<string> {
  const result = await execa("git", args, { cwd });
  return result.stdout.trim();
}

export async function repoRoot(cwd = process.cwd()): Promise<string> {
  return git(["rev-parse", "--show-toplevel"], cwd);
}

export async function resolveRef(ref: string, cwd: string): Promise<string> {
  return git(["rev-parse", ref], cwd);
}

export async function exportRefToTemp(ref: string, cwd: string): Promise<string> {
  const dir = mkdtempSync(path.join(tmpdir(), `archlens-${sanitize(ref)}-`));
  const archive = await execa("git", ["archive", "--format=tar", ref], { cwd, encoding: "buffer" });
  await execa("tar", ["-xf", "-", "-C", dir], { input: archive.stdout });
  return dir;
}

export async function withRefExports<T>(base: string, head: string, cwd: string, fn: (baseDir: string, headDir: string, baseSha: string, headSha: string) => Promise<T>): Promise<T> {
  const baseSha = await resolveRef(base, cwd);
  const headSha = await resolveRef(head, cwd);
  const baseDir = await exportRefToTemp(baseSha, cwd);
  const headDir = await exportRefToTemp(headSha, cwd);
  try {
    return await fn(baseDir, headDir, baseSha, headSha);
  } finally {
    rmSync(baseDir, { recursive: true, force: true });
    rmSync(headDir, { recursive: true, force: true });
  }
}

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]+/g, "-").slice(0, 40) || "ref";
}
