import type { ArchitectureEdge, ArchitectureNode, ArchitectureSnapshot, RiskSignal } from "./schema.js";

interface RiskInput {
  addedNodes: ArchitectureNode[];
  removedNodes: ArchitectureNode[];
  changedNodes: ArchitectureNode[];
  addedEdges: ArchitectureEdge[];
  removedEdges: ArchitectureEdge[];
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
      title: "Source changed without a detected test change",
      level: "warning",
      kind: "test-coverage-proxy",
      paths: sourceChanged.map((node) => node.path),
      detail: "ArchLens detected source/module changes but no test file changes in the compared snapshots.",
    });
  }

  const configTouched = touched.filter((node) => node.kind === "config" || node.kind === "workflow" || node.riskTags.includes("operations-sensitive"));
  if (configTouched.length > 0) {
    signals.push({
      id: "config-or-workflow-changed",
      title: "Config, workflow, or operations-sensitive file changed",
      level: "warning",
      kind: "operations",
      paths: configTouched.map((node) => node.path),
      detail: "Configuration and workflow changes can alter build, runtime, deployment, or review behavior.",
    });
  }

  const securityTouched = touched.filter((node) => node.riskTags.includes("security-sensitive"));
  if (securityTouched.length > 0) {
    signals.push({
      id: "security-sensitive-path-touched",
      title: "Security-sensitive path touched",
      level: "high",
      kind: "security-boundary",
      paths: securityTouched.map((node) => node.path),
      detail: "One or more changed paths mention auth, security, sessions, JWTs, tokens, permissions, or credentials.",
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
      detail: "A new import crosses top-level folders, which may indicate coupling between architecture areas.",
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
      detail: `Detected ${touched.length} changed files/modules and ${input.addedEdges.length + input.removedEdges.length} dependency edge changes.`,
    });
  }

  const centralRemoved = input.removedNodes.filter((node) => fanIn(node.id, input.headSnapshot.edges) >= 3 || node.riskTags.includes("entrypoint"));
  if (centralRemoved.length > 0) {
    signals.push({
      id: "central-file-removed",
      title: "Deleted or moved central file",
      level: "high",
      kind: "centrality",
      paths: centralRemoved.map((node) => node.path),
      detail: "A removed file looked central by entrypoint naming or dependency fan-in.",
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
