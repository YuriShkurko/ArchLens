import { edgeKey } from "./architectureSnapshot.js";
import { detectRiskSignals } from "./riskSignals.js";
import { ARCHLENS_VERSION, ArchitectureDiffSchema, type ArchitectureDiff, type ArchitectureEdge, type ArchitectureNode, type ArchitectureSnapshot, type RiskSignal } from "./schema.js";

export function diffArchitectureSnapshots(baseSnapshot: ArchitectureSnapshot, headSnapshot: ArchitectureSnapshot, base = "base", head = "head", now = new Date()): ArchitectureDiff {
  const baseNodes = new Map(baseSnapshot.nodes.map((node) => [node.id, node]));
  const headNodes = new Map(headSnapshot.nodes.map((node) => [node.id, node]));

  const addedNodes = headSnapshot.nodes.filter((node) => !baseNodes.has(node.id));
  const removedNodes = baseSnapshot.nodes.filter((node) => !headNodes.has(node.id));
  const changedNodes = headSnapshot.nodes.filter((node) => {
    const before = baseNodes.get(node.id);
    return before && before.contentHash !== node.contentHash;
  });

  const baseEdges = new Map(baseSnapshot.edges.map((edge) => [edgeKey(edge), edge]));
  const headEdges = new Map(headSnapshot.edges.map((edge) => [edgeKey(edge), edge]));
  const addedEdges = headSnapshot.edges.filter((edge) => !baseEdges.has(edgeKey(edge)));
  const removedEdges = baseSnapshot.edges.filter((edge) => !headEdges.has(edgeKey(edge)));

  const changedTestFiles = [...addedNodes, ...removedNodes, ...changedNodes]
    .filter((node) => node.kind === "test")
    .map((node) => node.path)
    .sort();
  const potentialRelatedTests = findPotentialRelatedTests([...addedNodes, ...changedNodes], headSnapshot.nodes);
  const riskSignals = detectRiskSignals({ addedNodes, removedNodes, changedNodes, addedEdges, removedEdges, baseSnapshot, headSnapshot });
  const reviewOrder = buildReviewOrder({ addedNodes, removedNodes, changedNodes, addedEdges, removedEdges, riskSignals });

  const diff: ArchitectureDiff = {
    version: ARCHLENS_VERSION,
    createdAt: now.toISOString(),
    base,
    head,
    addedNodes,
    removedNodes,
    changedNodes,
    addedEdges,
    removedEdges,
    riskSignals,
    reviewOrder,
    changedTestFiles,
    potentialRelatedTests,
    stats: {
      addedNodeCount: addedNodes.length,
      removedNodeCount: removedNodes.length,
      changedNodeCount: changedNodes.length,
      addedEdgeCount: addedEdges.length,
      removedEdgeCount: removedEdges.length,
    },
  };

  return ArchitectureDiffSchema.parse(diff);
}

interface ReviewOrderInput {
  addedNodes: ArchitectureNode[];
  removedNodes: ArchitectureNode[];
  changedNodes: ArchitectureNode[];
  addedEdges: ArchitectureEdge[];
  removedEdges: ArchitectureEdge[];
  riskSignals: RiskSignal[];
}

function buildReviewOrder(input: ReviewOrderInput): string[] {
  const touched = [...input.addedNodes, ...input.changedNodes, ...input.removedNodes];
  const byPath = new Map(touched.map((node) => [node.path, node]));
  const ordered = new Set<string>();

  for (const signal of [...input.riskSignals].sort(compareRiskSignal)) {
    for (const p of signal.paths.sort()) ordered.add(p);
  }

  for (const node of touched.filter(isConfigWorkflowOrDeploy).sort(compareNodePath)) ordered.add(node.path);

  const dependencyPaths = new Set<string>();
  for (const edge of [...input.addedEdges, ...input.removedEdges].sort(compareEdge)) {
    dependencyPaths.add(edge.from);
    dependencyPaths.add(edge.to);
  }
  for (const p of [...dependencyPaths].sort()) ordered.add(p);

  for (const node of touched.filter((node) => node.kind === "source").sort(compareNodePath)) ordered.add(node.path);
  for (const node of touched.filter((node) => node.kind === "test").sort(compareNodePath)) ordered.add(node.path);
  for (const node of touched.filter((node) => node.kind === "docs").sort(compareNodePath)) ordered.add(node.path);
  for (const node of touched.filter((node) => !byPath.has(node.path) || !["source", "test", "docs"].includes(node.kind)).sort(compareNodePath)) ordered.add(node.path);

  return [...ordered].filter(Boolean).slice(0, 30);
}

function findPotentialRelatedTests(changedNodes: ArchitectureNode[], allNodes: ArchitectureNode[]): string[] {
  const testPaths = new Set(allNodes.filter((node) => node.kind === "test").map((node) => node.path));
  const related = new Set<string>();
  for (const node of changedNodes.filter((n) => n.kind === "source")) {
    for (const candidate of relatedTestCandidates(node.path)) {
      if (testPaths.has(candidate)) related.add(candidate);
    }
  }
  return [...related].sort();
}

function relatedTestCandidates(sourcePath: string): string[] {
  const extless = sourcePath.replace(/\.[^.]+$/, "");
  const fileBase = extless.split("/").pop() ?? extless;
  const dir = extless.includes("/") ? extless.slice(0, extless.lastIndexOf("/")) : ".";
  const packageRoot = sourcePath.includes("/src/") ? sourcePath.slice(0, sourcePath.indexOf("/src/")) : dir.split("/")[0] ?? ".";
  return [
    `${extless}.test.ts`,
    `${extless}.spec.ts`,
    `${dir}/__tests__/${fileBase}.test.ts`,
    `${dir}/tests/${fileBase}.test.ts`,
    `${packageRoot}/src/tests/${fileBase}.test.ts`,
    `${packageRoot}/tests/${fileBase}.test.ts`,
  ].filter((p) => !p.startsWith("./"));
}

function isConfigWorkflowOrDeploy(node: ArchitectureNode): boolean {
  return node.kind === "config" || node.kind === "workflow" || node.riskTags.includes("operations-sensitive");
}

function compareRiskSignal(a: RiskSignal, b: RiskSignal): number {
  const rank = { high: 0, warning: 1, info: 2 } as const;
  return rank[a.level] - rank[b.level] || a.id.localeCompare(b.id);
}

function compareNodePath(a: ArchitectureNode, b: ArchitectureNode): number {
  return a.path.localeCompare(b.path);
}

function compareEdge(a: ArchitectureEdge, b: ArchitectureEdge): number {
  return `${a.from}->${a.to}:${a.kind}`.localeCompare(`${b.from}->${b.to}:${b.kind}`);
}
