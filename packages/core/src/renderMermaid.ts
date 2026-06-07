import type { ArchitectureDiff, ArchitectureEdge } from "./schema.js";

export function renderMermaid(diff: ArchitectureDiff): string {
  const edges = diff.addedEdges.slice(0, 20);
  if (edges.length === 0) return "";
  const lines = ["graph TD"];
  for (const edge of edges) {
    lines.push(`  ${nodeId(edge.from)}["${escapeLabel(edge.from)}"] -->|new import| ${nodeId(edge.to)}["${escapeLabel(edge.to)}"]`);
  }
  return lines.join("\n");
}

export function edgeLabel(edge: ArchitectureEdge): string {
  return `${edge.from} -> ${edge.to} (${edge.kind})`;
}

function nodeId(value: string): string {
  return `n_${value.replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

function escapeLabel(value: string): string {
  return value.replace(/"/g, "'");
}
