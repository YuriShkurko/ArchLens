import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execa } from "execa";

export class ArchLensGitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArchLensGitError";
  }
}

export async function git(args: string[], cwd: string): Promise<string> {
  try {
    const result = await execa("git", args, { cwd });
    return result.stdout.trim();
  } catch (error) {
    throw new ArchLensGitError(formatGitError(args, cwd, error));
  }
}

export async function repoRoot(cwd = process.cwd()): Promise<string> {
  return git(["rev-parse", "--show-toplevel"], cwd);
}

export async function resolveRef(ref: string, cwd: string): Promise<string> {
  return git(["rev-parse", ref], cwd);
}

export async function exportRefToTemp(ref: string, cwd: string): Promise<string> {
  const dir = mkdtempSync(path.join(tmpdir(), `archlens-${sanitize(ref)}-`));
  try {
    const archive = await execa("git", ["archive", "--format=tar", ref], { cwd, encoding: "buffer" });
    await execa("tar", ["-xf", "-", "-C", dir], { input: archive.stdout });
    return dir;
  } catch (error) {
    rmSync(dir, { recursive: true, force: true });
    throw new ArchLensGitError(formatGitError(["archive", "--format=tar", ref], cwd, error));
  }
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

function formatGitError(args: string[], cwd: string, error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : undefined;
  if (code === "ENOENT") return "Could not run git. Make sure git is installed and available on PATH.";

  if (args[0] === "rev-parse" && args[1] === "--show-toplevel") {
    return `Not inside a git repository: ${cwd}. Run ArchLens from a repository root or subdirectory.`;
  }

  if (args[0] === "rev-parse" && args[1]) {
    return `Git ref \`${args[1]}\` does not exist or cannot be resolved. Check the ref name, fetch missing branches, or try \`archlens diff --base HEAD~1 --head HEAD\`.`;
  }

  if (args[0] === "archive" && args.includes("--format=tar")) {
    const ref = args[args.length - 1] ?? "<ref>";
    return `Could not export git ref \`${ref}\`. Make sure the repository has commits and the ref exists.`;
  }

  const stderr = typeof error === "object" && error && "stderr" in error ? String((error as { stderr?: unknown }).stderr ?? "").trim() : "";
  const detail = stderr ? ` Git said: ${stderr}` : "";
  return `Git command failed: git ${args.join(" ")}.${detail}`;
}
