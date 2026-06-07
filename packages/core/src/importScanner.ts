import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface ImportRecord {
  sourcePath: string;
  specifier: string;
  kind: "import" | "dynamic";
  resolvedPath?: string;
  external: boolean;
}

const STATIC_IMPORT_RE = /(?:import|export)\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
const REQUIRE_RE = /require\s*\(\s*["']([^"']+)["']\s*\)/g;
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

export function scanImports(filePath: string, repoRoot: string): ImportRecord[] {
  const text = readFileSync(filePath, "utf8");
  const relSource = normalize(path.relative(repoRoot, filePath));
  const records: ImportRecord[] = [];

  collectMatches(text, STATIC_IMPORT_RE, (specifier) => {
    records.push(toRecord(relSource, specifier, "import", filePath, repoRoot));
  });
  collectMatches(text, DYNAMIC_IMPORT_RE, (specifier) => {
    records.push(toRecord(relSource, specifier, "dynamic", filePath, repoRoot));
  });
  collectMatches(text, REQUIRE_RE, (specifier) => {
    records.push(toRecord(relSource, specifier, "import", filePath, repoRoot));
  });

  return dedupeImports(records);
}

function collectMatches(text: string, re: RegExp, visit: (specifier: string) => void) {
  re.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match[1]) visit(match[1]);
  }
}

function toRecord(sourcePath: string, specifier: string, kind: "import" | "dynamic", filePath: string, repoRoot: string): ImportRecord {
  const resolvedPath = resolveLocalImport(filePath, specifier, repoRoot);
  return {
    sourcePath,
    specifier,
    kind,
    resolvedPath,
    external: !resolvedPath,
  };
}

export function resolveLocalImport(fromFile: string, specifier: string, repoRoot: string): string | undefined {
  if (!specifier.startsWith(".")) return undefined;
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    ...EXTENSIONS.map((ext) => base + ext),
    ...EXTENSIONS.map((ext) => path.join(base, "index" + ext)),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return normalize(path.relative(repoRoot, candidate));
  }
  return undefined;
}

function dedupeImports(records: ImportRecord[]): ImportRecord[] {
  const seen = new Set<string>();
  const out: ImportRecord[] = [];
  for (const record of records) {
    const key = `${record.sourcePath}\0${record.kind}\0${record.resolvedPath ?? record.specifier}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(record);
  }
  return out.sort((a, b) => `${a.sourcePath}:${a.specifier}`.localeCompare(`${b.sourcePath}:${b.specifier}`));
}

function normalize(value: string): string {
  return value.split(path.sep).join("/");
}
