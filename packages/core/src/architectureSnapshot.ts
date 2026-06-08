import path from "node:path";
import { scanPythonImports } from "./analyzers/python/importScanner.js";
import { scanImports } from "./importScanner.js";
import { isScannableSource, scanRepoFiles, PYTHON_ANALYZER, TYPESCRIPT_JAVASCRIPT_ANALYZER } from "./scanRepo.js";
import { ARCHLENS_VERSION, ArchitectureSnapshotSchema, type ArchitectureEdge, type ArchitectureSnapshot } from "./schema.js";

export function createArchitectureSnapshot(repoRoot: string, now = new Date()): ArchitectureSnapshot {
  const root = path.resolve(repoRoot);
  const nodes = scanRepoFiles(root);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const pythonPaths = nodes.filter((node) => node.language === "python").map((node) => node.path);
  const edges: ArchitectureEdge[] = [];
  let externalImportCount = 0;

  for (const node of nodes) {
    if (!isScannableSource(node.path)) continue;
    const imports = node.language === "python"
      ? scanPythonImports(path.join(root, node.path), root, pythonPaths)
      : scanImports(path.join(root, node.path), root);
    for (const record of imports) {
      if (!record.resolvedPath) {
        externalImportCount++;
        continue;
      }
      if (!nodeIds.has(record.resolvedPath)) continue;
      edges.push({
        from: node.id,
        to: record.resolvedPath,
        kind: record.kind,
        sourcePath: record.sourcePath,
      });
    }
  }

  const snapshot: ArchitectureSnapshot = {
    version: ARCHLENS_VERSION,
    createdAt: now.toISOString(),
    repoRoot: root,
    analyzers: [TYPESCRIPT_JAVASCRIPT_ANALYZER, PYTHON_ANALYZER],
    nodes,
    edges: dedupeEdges(edges),
    stats: {
      nodeCount: nodes.length,
      edgeCount: 0,
      sourceCount: nodes.filter((node) => node.kind === "source").length,
      testCount: nodes.filter((node) => node.kind === "test").length,
      externalImportCount,
    },
  };
  snapshot.stats.edgeCount = snapshot.edges.length;
  return ArchitectureSnapshotSchema.parse(snapshot);
}

function dedupeEdges(edges: ArchitectureEdge[]): ArchitectureEdge[] {
  const seen = new Set<string>();
  const out: ArchitectureEdge[] = [];
  for (const edge of edges.sort((a, b) => edgeKey(a).localeCompare(edgeKey(b)))) {
    const key = edgeKey(edge);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(edge);
  }
  return out;
}

export function edgeKey(edge: Pick<ArchitectureEdge, "from" | "to" | "kind">): string {
  return `${edge.from}->${edge.to}:${edge.kind}`;
}
