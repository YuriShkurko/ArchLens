import type { ArchitectureEdge, ArchitectureNode, ArchitectureSnapshot, RiskSignal } from "./schema.js";

interface RiskInput {
  addedNodes: ArchitectureNode[];
  removedNodes: ArchitectureNode[];
  changedNodes: ArchitectureNode[];
  addedEdges: ArchitectureEdge[];
  removedEdges: ArchitectureEdge[];
  baseSnapshot: ArchitectureSnapshot;
  headSnapshot: ArchitectureSnapshot;
  changedTestFiles: string[];
  potentialRelatedTests: string[];
}

export function detectRiskSignals(input: RiskInput): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const touched = [...input.addedNodes, ...input.removedNodes, ...input.changedNodes];
  const testsChanged = touched.some((node) => node.kind === "test");
  const sourceChanged = touched.filter((node) => node.kind === "source");
  const supportedLanguages = new Set(input.headSnapshot.analyzers.flatMap((analyzer) => analyzer.languages));
  const supportedSourceChanged = sourceChanged.filter((node) => supportedLanguages.has(node.language));
  const tsJsSourceChanged = supportedSourceChanged.filter((node) => node.language === "typescript" || node.language === "javascript");
  const pythonSourceChanged = supportedSourceChanged.filter((node) => node.language === "python");
  const unsupportedSourceChanged = sourceChanged.filter((node) => !supportedLanguages.has(node.language) && isUnsupportedLanguagePath(node.path, node.language));

  if (tsJsSourceChanged.length > 0 && !testsChanged) {
    signals.push({
      id: "supported-source-changed-without-tests",
      title: "Supported TypeScript/JavaScript source changed without a changed test file",
      level: "warning",
      kind: "test-coverage-proxy",
      paths: tsJsSourceChanged.map((node) => node.path),
      detail: "Analyzed TypeScript/JavaScript source changed with no test files changed in the same diff. Verify the behavior directly or confirm that existing tests cover the touched modules before merge."
    });
  }

  if (pythonSourceChanged.length > 0 && !hasPythonTestEvidence(input.changedTestFiles, input.potentialRelatedTests)) {
    signals.push({
      id: "python-source-changed-without-related-tests",
      title: "Python source changed without related tests detected",
      level: "warning",
      kind: "test-coverage-proxy",
      paths: pythonSourceChanged.map((node) => node.path),
      detail: "Python source files changed and no changed or potential related Python tests were detected by deterministic path heuristics. Verify the behavior directly or identify the relevant backend test coverage before merge."
    });
  }

  if (unsupportedSourceChanged.length > 0) {
    signals.push({
      id: "unsupported-source-changed-test-inference-unavailable",
      title: "Unsupported source changed; related-test inference unavailable",
      level: "info",
      kind: "unsupported-language",
      paths: unsupportedSourceChanged.map((node) => node.path),
      detail: "Source files in languages without an active analyzer changed. Dependency analysis and related-test inference are unavailable for these files in this version; review their language-specific imports and tests manually."
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
      detail: "Configuration, package, workflow, or deployment files changed. Verify the affected build/test/runtime command because these files can change behavior without obvious source-code call sites."
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
      detail: "New imports can shift module boundaries or make shared dependencies more central. Review the importing files and any shared targets with multiple new importers.",
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
      detail: `Detected ${touched.length} changed files/modules and ${input.addedEdges.length + input.removedEdges.length} dependency edge changes. Review by risk area and dependency hubs first so central files and configuration changes are checked before leaf modules.`
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

function isUnsupportedLanguagePath(pathName: string, language: string): boolean {
  if (language === "typescript" || language === "javascript" || language === "python") return false;
  return /\.(rs|go|java|kt|rb|php|cs|swift|c|cc|cpp|h|hpp)$/i.test(pathName);
}

function hasPythonTestEvidence(changedTestFiles: string[], potentialRelatedTests: string[]): boolean {
  return [...changedTestFiles, ...potentialRelatedTests].some((pathName) => pathName.endsWith(".py"));
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
