import { edgeKey } from "./architectureSnapshot.js";
import { detectRiskSignals } from "./riskSignals.js";
import { ARCHLENS_VERSION, ArchitectureDiffSchema, type ArchitectureDiff, type ArchitectureEdge, type ArchitectureNode, type ArchitectureSnapshot } from "./schema.js";

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

  const riskSignals = detectRiskSignals({ addedNodes, removedNodes, changedNodes, addedEdges, removedEdges, headSnapshot });
  const reviewOrder = buildReviewOrder(addedNodes, removedNodes, changedNodes, addedEdges, riskSignals.map((signal) => signal.paths).flat());

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

function buildReviewOrder(addedNodes: ArchitectureNode[], removedNodes: ArchitectureNode[], changedNodes: ArchitectureNode[], addedEdges: ArchitectureEdge[], riskPaths: string[]): string[] {
  const ordered = new Set<string>();
  for (const p of riskPaths.sort()) ordered.add(p);
  for (const edge of addedEdges) {
    ordered.add(edge.from);
    ordered.add(edge.to);
  }
  for (const node of [...changedNodes, ...addedNodes, ...removedNodes]) ordered.add(node.path);
  return [...ordered].filter(Boolean).slice(0, 30);
}
