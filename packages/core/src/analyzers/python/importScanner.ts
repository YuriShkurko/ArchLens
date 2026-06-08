import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ImportRecord } from "../../importScanner.js";

interface PythonImportFact {
  specifier: string;
  level: number;
}

const IMPORT_RE = /^\s*import\s+(.+)\s*$/;
const FROM_IMPORT_RE = /^\s*from\s+([\.]*(?:[A-Za-z_][\w]*)(?:\.[A-Za-z_][\w]*)*|\.+)\s+import\s+(.+)\s*$/;
const IDENTIFIER_RE = /^[A-Za-z_][\w]*$/;

export function scanPythonImports(filePath: string, repoRoot: string, allPythonPaths?: string[]): ImportRecord[] {
  const text = readFileSync(filePath, "utf8");
  const relSource = normalize(path.relative(repoRoot, filePath));
  const pythonPaths = allPythonPaths ?? discoverPythonPaths(repoRoot);
  const facts = extractPythonImportFacts(text);
  const records = facts.map((fact) => {
    const resolvedPath = resolvePythonImport({ fromFile: filePath, repoRoot, specifier: fact.specifier, level: fact.level, allPythonPaths: pythonPaths });
    return {
      sourcePath: relSource,
      specifier: fact.level > 0 ? `${".".repeat(fact.level)}${fact.specifier}` : fact.specifier,
      kind: "import" as const,
      resolvedPath,
      external: !resolvedPath,
    };
  });
  return dedupeImports(records);
}

export function extractPythonImportSpecifiers(text: string): string[] {
  return extractPythonImportFacts(text).map((fact) => fact.level > 0 ? `${".".repeat(fact.level)}${fact.specifier}` : fact.specifier);
}

function extractPythonImportFacts(text: string): PythonImportFact[] {
  const facts: PythonImportFact[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = stripComment(rawLine).trimEnd();
    if (!line || line.startsWith("#")) continue;

    const importMatch = IMPORT_RE.exec(line);
    if (importMatch?.[1]) {
      for (const part of importMatch[1].split(",")) {
        const specifier = part.trim().split(/\s+as\s+/i)[0]?.trim();
        if (specifier && isDottedName(specifier)) facts.push({ specifier, level: 0 });
      }
      continue;
    }

    const fromMatch = FROM_IMPORT_RE.exec(line);
    if (fromMatch?.[1] && fromMatch[2]) {
      const moduleText = fromMatch[1].trim();
      const level = moduleText.match(/^\.+/)?.[0].length ?? 0;
      const moduleName = moduleText.slice(level);
      if (moduleName && isDottedName(moduleName)) facts.push({ specifier: moduleName, level });
      for (const imported of fromMatch[2].split(",")) {
        const importedName = imported.trim().split(/\s+as\s+/i)[0]?.trim();
        if (!importedName || !IDENTIFIER_RE.test(importedName) || importedName === "*") continue;
        const combined = moduleName ? `${moduleName}.${importedName}` : importedName;
        if (isDottedName(combined)) facts.push({ specifier: combined, level });
      }
    }
  }
  return dedupeFacts(facts);
}

interface ResolveInput {
  fromFile: string;
  repoRoot: string;
  specifier: string;
  level: number;
  allPythonPaths: string[];
}

export function resolvePythonImport(input: ResolveInput): string | undefined {
  const fromRel = normalize(path.relative(input.repoRoot, input.fromFile));
  const candidates = input.level > 0
    ? relativeCandidates(fromRel, input.specifier, input.level, input.allPythonPaths)
    : absoluteCandidates(input.specifier, input.allPythonPaths);
  for (const rel of candidates) {
    const full = path.join(input.repoRoot, rel);
    if (existsSync(full)) return rel;
  }
  return undefined;
}

function absoluteCandidates(specifier: string, allPythonPaths: string[]): string[] {
  const suffixes = moduleSuffixes(specifier);
  const out = new Set<string>();
  const roots = sourceRoots(allPythonPaths);
  for (const root of roots) {
    for (const suffix of suffixes) out.add(root ? `${root}/${suffix}` : suffix);
  }
  for (const suffix of suffixes) {
    for (const filePath of allPythonPaths) {
      if (filePath.endsWith(`/${suffix}`) || filePath === suffix) out.add(filePath);
    }
  }
  return [...out];
}

function relativeCandidates(fromRel: string, specifier: string, level: number, allPythonPaths: string[]): string[] {
  const sourceDir = dirname(fromRel);
  const packageDir = ascend(sourceDir, Math.max(level - 1, 0));
  const suffixes = moduleSuffixes(specifier);
  const out = new Set<string>();
  for (const suffix of suffixes) out.add(packageDir ? `${packageDir}/${suffix}` : suffix);

  const packageRoot = nearestPackageRoot(sourceDir, allPythonPaths);
  if (packageRoot) {
    const fromUnderRoot = stripPrefix(sourceDir, packageRoot);
    const packageCandidateBase = ascend(fromUnderRoot, Math.max(level - 1, 0));
    for (const suffix of suffixes) out.add(packageCandidateBase ? `${packageRoot}/${packageCandidateBase}/${suffix}` : `${packageRoot}/${suffix}`);
  }
  return [...out];
}

function moduleSuffixes(specifier: string): string[] {
  const modulePath = specifier.split(".").filter(Boolean).join("/");
  return [`${modulePath}.py`, `${modulePath}/__init__.py`];
}

function sourceRoots(allPythonPaths: string[]): string[] {
  const roots = new Set<string>(["", "backend/src", "src"]);
  for (const filePath of allPythonPaths) {
    if (filePath.includes("/src/")) roots.add(filePath.slice(0, filePath.indexOf("/src/") + 4));
  }
  return [...roots].sort((a, b) => b.length - a.length || a.localeCompare(b));
}

function nearestPackageRoot(sourceDir: string, allPythonPaths: string[]): string | undefined {
  const parts = sourceDir.split("/");
  for (let i = parts.length; i >= 0; i--) {
    const candidate = parts.slice(0, i).join("/");
    if (allPythonPaths.includes(candidate ? `${candidate}/__init__.py` : "__init__.py")) return candidate;
  }
  return undefined;
}

function discoverPythonPaths(repoRoot: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readDirSafe(dir)) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if ([".git", ".venv", "venv", "env", "node_modules", "dist", "build", ".archlens", "__pycache__", ".pytest_cache"].includes(entry.name)) continue;
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".py")) {
        out.push(normalize(path.relative(repoRoot, full)));
      }
    }
  };
  walk(repoRoot);
  return out.sort();
}

function readDirSafe(dir: string) {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function stripComment(line: string): string {
  let quote: string | undefined;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if ((char === '"' || char === "'") && line[i - 1] !== "\\") quote = quote === char ? undefined : quote ?? char;
    if (char === "#" && !quote) return line.slice(0, i);
  }
  return line;
}

function isDottedName(value: string): boolean {
  return value.split(".").every((part) => IDENTIFIER_RE.test(part));
}

function dedupeFacts(facts: PythonImportFact[]): PythonImportFact[] {
  const seen = new Set<string>();
  const out: PythonImportFact[] = [];
  for (const fact of facts) {
    const key = `${fact.level}:${fact.specifier}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(fact);
  }
  return out;
}

function dedupeImports(records: ImportRecord[]): ImportRecord[] {
  const seen = new Set<string>();
  const out: ImportRecord[] = [];
  for (const record of records) {
    const key = `${record.sourcePath}\0${record.resolvedPath ?? record.specifier}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(record);
  }
  return out.sort((a, b) => `${a.sourcePath}:${a.specifier}`.localeCompare(`${b.sourcePath}:${b.specifier}`));
}

function dirname(relPath: string): string {
  const idx = relPath.lastIndexOf("/");
  return idx === -1 ? "" : relPath.slice(0, idx);
}

function ascend(relDir: string, levels: number): string {
  const parts = relDir ? relDir.split("/") : [];
  return parts.slice(0, Math.max(0, parts.length - levels)).join("/");
}

function stripPrefix(value: string, prefix: string): string {
  if (!prefix) return value;
  return value === prefix ? "" : value.startsWith(`${prefix}/`) ? value.slice(prefix.length + 1) : value;
}

function normalize(value: string): string {
  return value.split(path.sep).join("/");
}
