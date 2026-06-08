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
  const potentialRelatedTests = findPotentialRelatedTests([...addedNodes, ...changedNodes], headSnapshot.nodes, headSnapshot.edges);
  const riskSignals = detectRiskSignals({ addedNodes, removedNodes, changedNodes, addedEdges, removedEdges, baseSnapshot, headSnapshot, changedTestFiles, potentialRelatedTests });
  const reviewOrder = buildReviewOrder({ addedNodes, removedNodes, changedNodes, addedEdges, removedEdges, riskSignals, baseSnapshot, headSnapshot });
  const reviewRationale = buildReviewRationale({ addedNodes, removedNodes, changedNodes, addedEdges, removedEdges, riskSignals, baseSnapshot, headSnapshot, reviewOrder });

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
    analyzers: headSnapshot.analyzers,
    riskSignals,
    reviewOrder,
    reviewRationale,
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
  baseSnapshot: ArchitectureSnapshot;
  headSnapshot: ArchitectureSnapshot;
  reviewOrder?: string[];
}

function buildReviewOrder(input: ReviewOrderInput): string[] {
  const touched = [...input.addedNodes, ...input.changedNodes, ...input.removedNodes];
  const touchedPaths = new Set(touched.map((node) => node.path));
  const nodesByPath = new Map([...input.baseSnapshot.nodes, ...input.headSnapshot.nodes].map((node) => [node.path, node]));
  const ordered = new Set<string>();

  const highRiskPaths = new Set<string>();
  for (const signal of [...input.riskSignals].sort(compareRiskSignal)) {
    if (signal.level === "high" || signal.kind === "operations" || signal.kind === "security-boundary") {
      for (const p of signal.paths.sort()) highRiskPaths.add(p);
    }
  }
  for (const node of [...highRiskPaths].map((p) => nodesByPath.get(p)).filter(isNode).sort(compareNodePath)) ordered.add(node.path);
  for (const node of touched.filter(isConfigWorkflowOrDeploy).sort(compareNodePath)) ordered.add(node.path);

  const edgePaths = new Set<string>();
  for (const edge of [...input.addedEdges, ...input.removedEdges].sort(compareEdge)) {
    edgePaths.add(edge.from);
    edgePaths.add(edge.to);
  }

  const centralityScores = buildCentralityScores(input.headSnapshot.edges, input.baseSnapshot.edges);
  const changedCentral = touched
    .filter((node) => node.kind !== "docs" && node.kind !== "test")
    .filter((node) => (centralityScores.get(node.path) ?? 0) >= 5)
    .sort(compareByCentralityThenPath(centralityScores));
  for (const node of changedCentral) ordered.add(node.path);

  const changedOrAddedSources = new Set([...input.addedNodes, ...input.changedNodes].filter((node) => node.kind === "source").map((node) => node.path));
  const importedByTouched = new Map<string, Set<string>>();
  for (const edge of input.headSnapshot.edges) {
    if (!changedOrAddedSources.has(edge.from)) continue;
    if (!edgePaths.has(edge.to) && touchedPaths.has(edge.to)) continue;
    const importers = importedByTouched.get(edge.to) ?? new Set<string>();
    importers.add(edge.from);
    importedByTouched.set(edge.to, importers);
  }
  const sharedDependencies = [...importedByTouched.entries()]
    .filter(([, importers]) => importers.size >= 2)
    .map(([path]) => path)
    .sort((a, b) => (importedByTouched.get(b)?.size ?? 0) - (importedByTouched.get(a)?.size ?? 0) || a.localeCompare(b));
  for (const p of sharedDependencies) ordered.add(p);

  for (const p of [...edgePaths].sort((a, b) => (centralityScores.get(b) ?? 0) - (centralityScores.get(a) ?? 0) || a.localeCompare(b))) ordered.add(p);
  for (const node of touched.filter((node) => node.kind === "source").sort(compareByCentralityThenPath(centralityScores))) ordered.add(node.path);
  for (const node of touched.filter((node) => node.kind === "test").sort(compareNodePath)) ordered.add(node.path);
  for (const node of touched.filter((node) => node.kind === "docs").sort(compareNodePath)) ordered.add(node.path);
  for (const node of touched.filter((node) => !["source", "test", "docs"].includes(node.kind)).sort(compareNodePath)) ordered.add(node.path);

  return [...ordered].filter(Boolean).slice(0, 30);
}

function buildReviewRationale(input: ReviewOrderInput): string[] {
  const touched = [...input.addedNodes, ...input.changedNodes, ...input.removedNodes];
  const changedOrAddedSources = new Set([...input.addedNodes, ...input.changedNodes].filter((node) => node.kind === "source").map((node) => node.path));
  const nodesByPath = new Map([...input.baseSnapshot.nodes, ...input.headSnapshot.nodes].map((node) => [node.path, node]));
  const rationale = new Set<string>();

  for (const pathName of input.reviewOrder ?? []) {
    const node = nodesByPath.get(pathName);
    if (node && isConfigWorkflowOrDeploy(node)) rationale.add(`\`${pathName}\` ranked early because it is operations/config-sensitive.`);
  }

  const importersByTarget = new Map<string, Set<string>>();
  for (const edge of input.headSnapshot.edges) {
    if (!changedOrAddedSources.has(edge.from)) continue;
    const importers = importersByTarget.get(edge.to) ?? new Set<string>();
    importers.add(edge.from);
    importersByTarget.set(edge.to, importers);
  }

  for (const [target, importers] of [...importersByTarget.entries()].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))) {
    if (importers.size < 2) continue;
    const targetNode = nodesByPath.get(target);
    const prefix = targetNode?.language === "python" || target.endsWith(".py") ? "Python module" : "it";
    const routeImporters = [...importers].filter((pathName) => /\/routes?\//.test(pathName));
    const reason = routeImporters.length >= 2 ? `${prefix} is imported by ${routeImporters.length} changed route modules` : `${prefix} is imported by ${importers.size} changed modules`;
    rationale.add(`\`${target}\` ranked early because ${reason}.`);
  }

  return [...rationale].slice(0, 12);
}

function findPotentialRelatedTests(changedNodes: ArchitectureNode[], allNodes: ArchitectureNode[], edges: ArchitectureEdge[]): string[] {
  const testNodes = allNodes.filter((node) => node.kind === "test");
  const testPaths = new Set(testNodes.map((node) => node.path));
  const changedSourcePaths = new Set(changedNodes.filter((n) => n.kind === "source").map((node) => node.path));
  const related = new Set<string>();

  for (const edge of edges) {
    if (!changedSourcePaths.has(edge.to)) continue;
    const importer = allNodes.find((node) => node.path === edge.from);
    if (importer?.kind === "test") related.add(importer.path);
  }

  for (const node of changedNodes.filter((n) => n.kind === "source")) {
    for (const candidate of relatedTestCandidates(node.path, node.language)) {
      if (testPaths.has(candidate)) related.add(candidate);
    }
    for (const testNode of testNodes) {
      if (isLikelyRelatedTest(node.path, node.language, testNode.path)) related.add(testNode.path);
    }
  }
  return [...related].sort();
}

function relatedTestCandidates(sourcePath: string, language: string): string[] {
  const extless = sourcePath.replace(/\.[^.]+$/, "");
  const fileBase = extless.split("/").pop() ?? extless;
  const dir = extless.includes("/") ? extless.slice(0, extless.lastIndexOf("/")) : ".";
  const packageRoot = sourcePath.includes("/src/") ? sourcePath.slice(0, sourcePath.indexOf("/src/")) : dir.split("/")[0] ?? ".";
  if (language === "python") {
    const afterSrc = sourcePath.includes("/src/") ? sourcePath.slice(sourcePath.indexOf("/src/") + 5).replace(/\.[^.]+$/, "") : extless;
    const packageRelative = afterSrc.split("/").slice(1).join("/");
    return [
      `${packageRoot}/tests/test_${fileBase}.py`,
      `${packageRoot}/tests/${packageRelative ? packageRelative.slice(0, packageRelative.lastIndexOf("/")) + "/" : ""}test_${fileBase}.py`,
      `${dir}/test_${fileBase}.py`,
      `${dir}/tests/test_${fileBase}.py`,
      `tests/test_${fileBase}.py`,
      `tests/${packageRelative ? packageRelative.slice(0, packageRelative.lastIndexOf("/")) + "/" : ""}test_${fileBase}.py`,
    ].filter((p) => p && !p.startsWith("./") && !p.includes("//"));
  }
  return [
    `${extless}.test.ts`,
    `${extless}.spec.ts`,
    `${dir}/__tests__/${fileBase}.test.ts`,
    `${dir}/tests/${fileBase}.test.ts`,
    `${packageRoot}/src/tests/${fileBase}.test.ts`,
    `${packageRoot}/tests/${fileBase}.test.ts`,
  ].filter((p) => !p.startsWith("./"));
}

function isLikelyRelatedTest(sourcePath: string, language: string, testPath: string): boolean {
  if (language !== "python") return false;
  const fileBase = sourcePath.replace(/\.[^.]+$/, "").split("/").pop();
  if (!fileBase || !testPath.endsWith(".py")) return false;
  const testName = testPath.split("/").pop() ?? testPath;
  return testName === `test_${fileBase}.py` || testName === `${fileBase}_test.py`;
}

function isConfigWorkflowOrDeploy(node: ArchitectureNode): boolean {
  return node.kind === "config" || node.kind === "workflow" || node.riskTags.includes("operations-sensitive");
}

function buildCentralityScores(headEdges: ArchitectureEdge[], baseEdges: ArchitectureEdge[]): Map<string, number> {
  const scores = new Map<string, number>();
  for (const edge of [...headEdges, ...baseEdges]) {
    scores.set(edge.from, (scores.get(edge.from) ?? 0) + 1);
    scores.set(edge.to, (scores.get(edge.to) ?? 0) + 1);
  }
  return scores;
}

function compareByCentralityThenPath(scores: Map<string, number>): (a: ArchitectureNode, b: ArchitectureNode) => number {
  return (a, b) => (scores.get(b.path) ?? 0) - (scores.get(a.path) ?? 0) || a.path.localeCompare(b.path);
}

function isNode(value: ArchitectureNode | undefined): value is ArchitectureNode {
  return value !== undefined;
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
