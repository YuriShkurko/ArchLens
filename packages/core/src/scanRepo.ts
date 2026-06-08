import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { AnalyzerMetadata, ArchitectureNode, ArchitectureNodeKind } from "./schema.js";

export const DEFAULT_IGNORED_DIRS = [
  ".git",
  ".venv",
  "venv",
  "env",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo",
  ".cache",
  "coverage",
  ".pytest_cache",
  "__pycache__",
  ".archlens",
] as const;

const IGNORED_DIRS = new Set<string>(DEFAULT_IGNORED_DIRS);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const KNOWN_UNSUPPORTED_LANGUAGE_EXTENSIONS = new Set([".py", ".go", ".java", ".cs", ".rb", ".php"]);

export const TYPESCRIPT_JAVASCRIPT_ANALYZER: AnalyzerMetadata = {
  name: "typescript-javascript",
  languages: ["typescript", "javascript"],
  fileExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
  capabilities: [
    "static-imports",
    "exports",
    "require-string-literals",
    "dynamic-import-string-literals",
    "relative-import-resolution",
    "test-path-heuristics",
  ],
  limitations: ["tsconfig-path-aliases-not-fully-resolved", "dynamic-expressions-not-resolved", "no-symbol-call-graph"],
};
const CONFIG_NAMES = new Set([
  "package.json",
  "tsconfig.json",
  "vite.config.ts",
  "vitest.config.ts",
  "webpack.config.js",
  "rollup.config.js",
  "pnpm-workspace.yaml",
  "Dockerfile",
]);

export function scanRepoFiles(repoRoot: string): ArchitectureNode[] {
  const root = path.resolve(repoRoot);
  const files = walk(root, root);
  return files.map((file) => nodeForFile(root, file)).sort((a, b) => a.path.localeCompare(b.path));
}

export function isScannableSource(pathName: string): boolean {
  return SOURCE_EXTENSIONS.has(path.extname(pathName));
}

export function isKnownUnsupportedLanguagePath(pathName: string): boolean {
  return KNOWN_UNSUPPORTED_LANGUAGE_EXTENSIONS.has(path.extname(pathName).toLowerCase());
}

function walk(repoRoot: string, dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      out.push(...walk(repoRoot, path.join(dir, entry.name)));
      continue;
    }
    if (!entry.isFile()) continue;
    const full = path.join(dir, entry.name);
    const kind = classifyPath(normalize(path.relative(repoRoot, full)), entry.name);
    if (isScannableSource(full) || isKnownUnsupportedLanguagePath(full) || kind !== "unknown") out.push(full);
  }
  return out;
}

function nodeForFile(repoRoot: string, fullPath: string): ArchitectureNode {
  const relPath = normalize(path.relative(repoRoot, fullPath));
  const kind = classifyPath(relPath, path.basename(fullPath));
  return {
    id: relPath,
    path: relPath,
    kind,
    language: languageFor(fullPath),
    riskTags: riskTagsFor(relPath, kind),
    contentHash: hashFile(fullPath),
  };
}

function classifyPath(relPath: string, name: string): ArchitectureNodeKind {
  const lower = relPath.toLowerCase();
  if (lower.includes("/.github/workflows/") || lower.startsWith(".github/workflows/")) {
    return "workflow";
  }
  if (lower.endsWith(".md") || lower.startsWith("docs/")) return "docs";
  if (CONFIG_NAMES.has(name) || lower.includes("config") || lower.endsWith(".json") || lower.endsWith(".yml") || lower.endsWith(".yaml") || lower.endsWith("dockerfile")) return "config";
  if (/(__tests__|\.test\.|\.spec\.|\/tests?\/)/i.test(relPath)) return "test";
  if (isScannableSource(relPath) || isKnownUnsupportedLanguagePath(relPath)) return "source";
  return "unknown";
}

function languageFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".ts" || ext === ".tsx") return "typescript";
  if ([".js", ".jsx", ".mjs", ".cjs"].includes(ext)) return "javascript";
  if (ext === ".md") return "markdown";
  if (ext === ".py") return "python";
  if (ext === ".go") return "go";
  if (ext === ".java") return "java";
  if (ext === ".cs") return "csharp";
  if (ext === ".rb") return "ruby";
  if (ext === ".php") return "php";
  if ([".yml", ".yaml"].includes(ext)) return "yaml";
  if (ext === ".json") return "json";
  return "unknown";
}

function riskTagsFor(relPath: string, kind: ArchitectureNodeKind): string[] {
  const lower = relPath.toLowerCase();
  const tags = new Set<string>();
  if (kind === "config") tags.add("config");
  if (kind === "workflow") tags.add("workflow");
  if (/auth|security|session|jwt|token|permission|credential/.test(lower)) tags.add("security-sensitive");
  if (/dockerfile|compose|\.github\/workflows|deploy|(^|\/)(infra|migrations?)(\/|$)/.test(lower)) tags.add("operations-sensitive");
  if (/index\.[tj]sx?$|main\.[tj]sx?$|app\.[tj]sx?$|cli\//.test(lower)) tags.add("entrypoint");
  return [...tags].sort();
}

function hashFile(filePath: string): string {
  const buf = readFileSync(filePath);
  return createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

function normalize(value: string): string {
  return value.split(path.sep).join("/");
}
