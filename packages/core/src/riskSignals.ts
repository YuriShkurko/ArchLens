import type { ArchitectureEdge, ArchitectureNode, ArchitectureSnapshot, RiskSignal } from "./schema.js";

interface RiskInput {
  addedNodes: ArchitectureNode[];
  removedNodes: ArchitectureNode[];
  changedNodes: ArchitectureNode[];
  addedEdges: ArchitectureEdge[];
  removedEdges: ArchitectureEdge[];
  baseSnapshot: ArchitectureSnapshot;
  headSnapshot: ArchitectureSnapshot;
}

export function detectRiskSignals(input: RiskInput): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const touched = [...input.addedNodes, ...input.removedNodes, ...input.changedNodes];
  const testsChanged = touched.some((node) => node.kind === "test");
  const sourceChanged = touched.filter((node) => node.kind === "source");

  if (sourceChanged.length > 0 && !testsChanged) {
    signals.push({
      id: "source-without-related-test-change",
      title: "Source changed without a changed test file",
      level: "warning",
      kind: "test-coverage-proxy",
      paths: sourceChanged.map((node) => node.path),
      detail: "Source files changed, but ArchLens did not detect changed test files in this diff. Check the potential related tests section and verify coverage manually if behavior changed.",
    });
  }

  const configTouched = touched.filter((node) => node.kind === "config" || node.kind === "workflow" || node.riskTags.includes("operations-sensitive"));
  if (configTouched.length > 0) {
    signals.push({
      id: "config-or-workflow-changed",
      title: "Workflow/config/deployment file changed",
      level: "warning",
      kind: "operations",
      paths: configTouched.map((node) => node.path),
      detail: "Workflow/config files changed. This may affect CI, validation, build, runtime, or release behavior. Verify the relevant workflow or command has run successfully before merge.",
    });
  }

  const securityTouched = touched.filter((node) => node.riskTags.includes("security-sensitive"));
  if (securityTouched.length > 0) {
    signals.push({
      id: "security-sensitive-path-touched",
      title: "Security-sensitive path changed",
      level: "high",
      kind: "security-boundary",
      paths: securityTouched.map((node) => node.path),
      detail: "Changed paths mention auth, security, sessions, JWTs, tokens, permissions, or credentials. Review data flow, access checks, and tests around this boundary before merge.",
    });
  }

  if (input.addedEdges.length > 0) {
    signals.push({
      id: "dependency-edges-added",
      title: "New dependency edge added",
      level: "info",
      kind: "dependency-graph",
      paths: input.addedEdges.flatMap((edge) => [edge.from, edge.to]),
      detail: "One or more files now import modules they did not import before. Review whether the new dependency direction matches the intended architecture.",
    });
  }

  const crossBoundary = input.addedEdges.filter((edge) => topFolder(edge.from) !== topFolder(edge.to));
  if (crossBoundary.length > 0) {
    signals.push({
      id: "new-cross-boundary-dependency",
      title: "New cross-boundary dependency edge",
      level: "warning",
      kind: "dependency-boundary",
      paths: crossBoundary.flatMap((edge) => [edge.from, edge.to]),
      detail: "A new import crosses top-level folders. Confirm the dependency direction is intentional and does not couple separate architecture areas unexpectedly.",
    });
  }

  const cliToCore = input.addedEdges.filter((edge) => /(^|\/)cli\//.test(edge.from) && /(^|\/)core\//.test(edge.to));
  if (cliToCore.length > 0) {
    signals.push({
      id: "cli-to-core-internal-edge",
      title: "New CLI-to-core dependency edge",
      level: "info",
      kind: "layering",
      paths: cliToCore.flatMap((edge) => [edge.from, edge.to]),
      detail: "A CLI-layer file now imports a core/internal module. Confirm this direction is intended for the project layering.",
    });
  }

  const touchedCount = touched.length + input.addedEdges.length + input.removedEdges.length;
  if (touchedCount >= 15) {
    signals.push({
      id: "oversized-architecture-change",
      title: "Large structural change set",
      level: "warning",
      kind: "change-size",
      paths: touched.map((node) => node.path),
      detail: `Detected ${touched.length} changed files/modules and ${input.addedEdges.length + input.removedEdges.length} dependency edge changes. Consider reviewing by risk area rather than reading alphabetically.`,
    });
  }

  const centralRemoved = input.removedNodes.filter((node) => fanIn(node.id, input.baseSnapshot.edges) >= 3 || node.riskTags.includes("entrypoint"));
  if (centralRemoved.length > 0) {
    signals.push({
      id: "central-file-removed",
      title: "Deleted or moved central file",
      level: "high",
      kind: "centrality",
      paths: centralRemoved.map((node) => node.path),
      detail: "A removed file looked central by entrypoint naming or dependency fan-in in the base snapshot. Confirm imports, entrypoints, and replacement paths are intentional.",
    });
  }

  return dedupeSignals(signals);
}

function topFolder(pathName: string): string {
  const parts = pathName.split("/");
  return parts.length > 1 ? parts[0] : ".";
}

function fanIn(id: string, edges: ArchitectureEdge[]): number {
  return edges.filter((edge) => edge.to === id).length;
}

function dedupeSignals(signals: RiskSignal[]): RiskSignal[] {
  const seen = new Set<string>();
  return signals.filter((signal) => {
    if (seen.has(signal.id)) return false;
    seen.add(signal.id);
    signal.paths = [...new Set(signal.paths)].sort();
    return true;
  });
}
