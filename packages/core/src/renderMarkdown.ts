import { edgeLabel, renderMermaid } from "./renderMermaid.js";
import type { ArchitectureDiff, ArchitectureNode, RiskSignal } from "./schema.js";

export type ReportMode = "pr" | "full";

export interface RenderOptions {
  authorNote?: string;
  mode?: ReportMode;
}

const PR_EXAMPLE_LIMIT = 5;
const PR_EDGE_LIMIT = 8;
const PR_REVIEW_LIMIT = 15;
const PR_MERMAID_EDGE_LIMIT = 10;

export function renderMarkdown(diff: ArchitectureDiff, options: RenderOptions = {}): string {
  const mode = options.mode ?? "pr";
  const mermaid = renderMermaid(diff);
  const lines: string[] = [];
  lines.push("# Architecture Impact Report", "");
  lines.push("> Deterministic architecture-impact facts for this change. ArchLens does not infer author intent.", "");

  lines.push("## Summary of detected structural changes", "");
  lines.push(`- Base: \`${diff.base}\``);
  lines.push(`- Head: \`${diff.head}\``);
  lines.push(`- Added files/modules: ${diff.addedNodes.length}`);
  lines.push(`- Removed files/modules: ${diff.removedNodes.length}`);
  lines.push(`- Changed files/modules: ${diff.changedNodes.length}`);
  lines.push(`- Added dependency edges: ${diff.addedEdges.length}`);
  lines.push(`- Removed dependency edges: ${diff.removedEdges.length}`, "");

  lines.push("## Analyzer scope", "");
  lines.push(...analyzerScopeLines(diff, mode), "");

  lines.push("## Architecture story", "");
  sectionList(lines, undefined, buildArchitectureStory(diff), { plain: true, emptyText: "No structural story patterns detected from the current dependency facts." });

  if (mode === "full") renderFullFacts(lines, diff);
  else renderPrFacts(lines, diff);

  renderConfigVerification(lines, diff, mode);

  lines.push("## Key risks", "");
  renderRiskSignals(lines, diff.riskSignals, mode);

  lines.push("## Tests", "");
  renderTestsSection(lines, diff, mode);

  lines.push("## Suggested review order", "");
  lines.push("Risk-first, deterministic order: high-risk config/workflow/deployment/security paths; central changed files and shared dependencies; dependency-edge participants; changed source; tests; then docs.", "");
  sectionList(lines, undefined, mode === "full" ? diff.reviewOrder : diff.reviewOrder.slice(0, PR_REVIEW_LIMIT));
  if (mode === "pr" && diff.reviewOrder.length > PR_REVIEW_LIMIT) lines.push(`- ${diff.reviewOrder.length - PR_REVIEW_LIMIT} more paths omitted from PR mode; see \`.archlens/architecture-diff.json\` or render with \`--mode full\`.`, "");
  renderReviewRationale(lines, diff, mode);

  lines.push("## Author-provided context", "");
  lines.push(options.authorNote?.trim() ? options.authorNote.trim() : "- No author note provided.", "");

  lines.push("## Appendix: limitations and caveats", "");
  lines.push("- ArchLens does not know author intent or whether CI, tests, or deployment workflows have passed unless that evidence is provided separately.");
  if (hasWorkflowChange(diff)) lines.push("- A workflow/config/package/deployment file changed; verify the relevant local command or CI job before merge.");
  lines.push("- Dependency and related-test inference currently comes from language-specific analyzers; v0.1.x ships TypeScript/JavaScript first.");
  lines.push("- TypeScript path aliases and non-relative imports may be unresolved in v0.1.");
  lines.push("- Dynamic imports are only detected when the specifier is a string literal.");
  lines.push("- Risk signals are deterministic heuristics, not proof of bugs.", "");

  renderMermaidSection(lines, mermaid, diff, mode);

  if (mode === "pr") {
    lines.push("## Appendix: full-detail pointers", "");
    lines.push("- Full node/edge details are available in `.archlens/architecture-diff.json`.");
    lines.push("- Run `archlens render --mode full` for the detailed Markdown report.", "");
  }

  return lines.join("\n");
}

function renderPrFacts(lines: string[], diff: ArchitectureDiff): void {
  lines.push("## Key detected facts", "");
  compactNodeLine(lines, "Added files/modules", prioritizeNodeExamples(diff.addedNodes, diff), PR_EXAMPLE_LIMIT);
  compactNodeLine(lines, "Removed files/modules", prioritizeNodeExamples(diff.removedNodes, diff), PR_EXAMPLE_LIMIT);
  compactNodeLine(lines, "Changed files/modules", prioritizeNodeExamples(diff.changedNodes, diff), PR_EXAMPLE_LIMIT);
  compactTextLine(lines, "Added dependency edges", diff.addedEdges.map(edgeLabel), PR_EDGE_LIMIT);
  compactTextLine(lines, "Removed dependency edges", diff.removedEdges.map(edgeLabel), PR_EDGE_LIMIT);
  lines.push("");
}

function renderFullFacts(lines: string[], diff: ArchitectureDiff): void {
  lines.push("## Detected facts", "");
  sectionList(lines, "### Added files or modules", diff.addedNodes.map(formatNodeFact));
  sectionList(lines, "### Removed files or modules", diff.removedNodes.map(formatNodeFact));
  sectionList(lines, "### Changed files or modules", diff.changedNodes.map(formatNodeFact));
  sectionList(lines, "### Added dependency edges", diff.addedEdges.map(edgeLabel));
  sectionList(lines, "### Removed dependency edges", diff.removedEdges.map(edgeLabel));
}

function renderConfigVerification(lines: string[], diff: ArchitectureDiff, mode: ReportMode): void {
  const configNodes = [...diff.addedNodes, ...diff.changedNodes, ...diff.removedNodes]
    .filter((node) => node.kind === "config" || node.kind === "workflow" || node.riskTags.includes("operations-sensitive"))
    .sort(compareNodePath);
  if (configNodes.length === 0) return;
  lines.push("## Package/config verification", "");
  lines.push("- Package/config/workflow/deployment files changed.");
  lines.push("- Verify install/build/test/runtime commands that depend on these files.");
  compactTextLine(lines, "Key files", configNodes.map((node) => node.path), mode === "full" ? configNodes.length : PR_EXAMPLE_LIMIT);
  lines.push("");
}

function renderRiskSignals(lines: string[], signals: RiskSignal[], mode: ReportMode): void {
  if (signals.length === 0) {
    lines.push("- No risk signals detected by the current deterministic rules.", "");
    return;
  }
  for (const signal of signals) {
    lines.push(`- **${signal.level.toUpperCase()} — ${signal.title}** (${signal.kind})`);
    lines.push(`  - ${signal.detail}`);
    if (signal.paths.length > 0) {
      const limit = mode === "full" ? signal.paths.length : PR_EXAMPLE_LIMIT;
      lines.push(`  - Paths: ${formatExamples(signal.paths, limit)}`);
    }
  }
  lines.push("");
}

function renderTestsSection(lines: string[], diff: ArchitectureDiff, mode: ReportMode): void {
  sectionList(lines, "### Changed test files", diff.changedTestFiles);
  sectionList(lines, "### Potential related existing tests", diff.potentialRelatedTests, { emptyText: "No related existing tests found by TypeScript/JavaScript path heuristics." });

  const unsupported = changedUnsupportedLanguagePaths(diff);
  const byLanguage = unsupportedLanguageCounts(diff);
  lines.push("### Unsupported related-test inference", "");
  if (unsupported.length === 0) {
    lines.push("- No changed files requiring unsupported-language related-test inference were detected.", "");
  } else {
    lines.push("- Unsupported language areas are listed as scope limitations, not as no-risk areas.");
    for (const [language, count] of byLanguage) {
      lines.push(`- ${language} files changed: ${count}`);
      lines.push(`  - ${language} dependency analysis: not supported in this version.`);
      lines.push(`  - ${language} related-test inference: not supported in this version.`);
    }
    const limit = mode === "full" ? unsupported.length : PR_EXAMPLE_LIMIT;
    lines.push(`- Example paths: ${formatExamples(unsupported, limit)}`);
    if (mode === "pr" && unsupported.length > limit) lines.push("- Full unsupported-path details are available in `.archlens/architecture-diff.json` or `--mode full`.");
    lines.push("");
  }
}

function renderReviewRationale(lines: string[], diff: ArchitectureDiff, mode: ReportMode): void {
  const rationale = buildReviewRationale(diff);
  lines.push("### Review-order rationale", "");
  if (rationale.length === 0) {
    lines.push("- No central dependency rationale detected by the current deterministic rules.", "");
    return;
  }
  sectionList(lines, undefined, mode === "full" ? rationale : rationale.slice(0, 6), { plain: true });
  if (mode === "pr" && rationale.length > 6) lines.push(`- ${rationale.length - 6} more rationale item${rationale.length - 6 === 1 ? "" : "s"} omitted in PR mode.`, "");
}

function renderMermaidSection(lines: string[], mermaid: string, diff: ArchitectureDiff, mode: ReportMode): void {
  lines.push("## Appendix: Mermaid dependency diagram", "");
  if (!mermaid) {
    lines.push("- No new dependency edges detected, so no dependency-edge diagram was generated.", "");
    return;
  }
  if (mode === "pr" && diff.addedEdges.length > PR_MERMAID_EDGE_LIMIT) {
    lines.push(`- Diagram omitted in PR mode because ${diff.addedEdges.length} new dependency edges would dominate the report.`);
    lines.push("- Run `archlens render --mode full` for the full Mermaid diagram.", "");
    return;
  }
  lines.push("```mermaid", mermaid, "```", "");
}

function sectionList(lines: string[], heading: string | undefined, items: string[], options: { plain?: boolean; emptyText?: string } = {}) {
  if (heading) lines.push(heading, "");
  if (items.length === 0) lines.push(`- ${options.emptyText ?? "None detected."}`, "");
  else lines.push(...items.map((item) => options.plain ? `- ${item}` : `- \`${item}\``), "");
}

function compactNodeLine(lines: string[], label: string, nodes: ArchitectureNode[], limit: number): void {
  compactTextLine(lines, label, nodes.map(formatNodeFact), limit);
}

function prioritizeNodeExamples(nodes: ArchitectureNode[], diff: ArchitectureDiff): ArchitectureNode[] {
  const supported = new Set(diff.analyzers.flatMap((analyzer) => analyzer.languages));
  return [...nodes].sort((a, b) => nodeExampleRank(a, supported) - nodeExampleRank(b, supported) || a.path.localeCompare(b.path));
}

function nodeExampleRank(node: ArchitectureNode, supported: Set<string>): number {
  if (supported.has(node.language)) return 0;
  if (node.kind === "config" || node.kind === "workflow") return 1;
  if (node.kind === "test") return 2;
  if (unsupportedLanguageLabel(node)) return 3;
  if (node.kind === "docs") return 4;
  return 5;
}

function compactTextLine(lines: string[], label: string, items: string[], limit: number): void {
  if (items.length === 0) {
    lines.push(`- ${label}: none detected.`);
    return;
  }
  lines.push(`- ${label}: ${items.length}`);
  lines.push(`  - Examples: ${formatExamples(items, limit)}`);
}

function formatExamples(items: string[], limit: number): string {
  const shown = items.slice(0, limit).map((item) => `\`${item}\``).join(", ");
  const remaining = items.length - Math.min(items.length, limit);
  return remaining > 0 ? `${shown} (+${remaining} more)` : shown;
}

function formatNodeFact(node: ArchitectureDiff["addedNodes"][number]): string {
  const tags = node.riskTags.length > 0 ? ` — ${node.riskTags.join(", ")}` : "";
  return `${node.path} (${node.kind}, ${node.language}${tags})`;
}

function buildArchitectureStory(diff: ArchitectureDiff): string[] {
  const story = new Set<string>();
  const changedOrAdded = new Set([...diff.addedNodes, ...diff.changedNodes].map((node) => node.path));
  const removedTargets = new Set(diff.removedEdges.map((edge) => edge.to));

  if (diff.addedEdges.some((edge) => isEntrypoint(edge.from) && /\/routes?\//.test(edge.to))) {
    story.add("Entrypoint now imports route modules.");
  }

  const componentImporters = groupedTargets(diff.addedEdges.filter((edge) => /\/components?\//.test(edge.to) && changedOrAdded.has(edge.from)));
  for (const [target, importers] of componentImporters) {
    if (importers.size >= 2 && importersMatching(importers, /\/routes?\//)) story.add(`${moduleName(target)} is now shared by route modules.`);
  }

  if (diff.addedEdges.some((edge) => /\/components?\//.test(edge.from) && /\/components?\//.test(edge.to))) {
    const composers = [...new Set(diff.addedEdges.filter((edge) => /\/components?\//.test(edge.from) && /\/components?\//.test(edge.to)).map((edge) => edge.from))].sort();
    for (const composer of composers.slice(0, 3)) story.add(`${moduleName(composer)} composes smaller UI components.`);
  }

  for (const removed of [...removedTargets].filter((target) => changedOrAdded.has(target) || isEntrypoint(target)).sort().slice(0, 3)) {
    story.add(`A previous ${moduleName(removed)} dependency was removed.`);
  }

  if (diff.addedEdges.length > 0 && story.size === 0) story.add(`${diff.addedEdges.length} new dependency edge${diff.addedEdges.length === 1 ? "" : "s"} detected among changed modules.`);
  if (diff.removedEdges.length > 0 && story.size === 0) story.add(`${diff.removedEdges.length} dependency edge${diff.removedEdges.length === 1 ? "" : "s"} removed among changed modules.`);

  return [...story].sort();
}

function analyzerScopeLines(diff: ArchitectureDiff, mode: ReportMode): string[] {
  const names = diff.analyzers.map((analyzer) => analyzer.name).sort();
  const languages = [...new Set(diff.analyzers.flatMap((analyzer) => analyzer.languages))].sort();
  const lines = names.length > 0
    ? [`- ArchLens analyzed ${formatLanguages(languages)} architecture facts in this repository.`, `- Active analyzer metadata: ${names.map((name) => `\`${name}\``).join(", ")}.`]
    : ["- No analyzer metadata was recorded for this diff."];
  const counts = unsupportedLanguageCounts(diff);
  for (const [language, count] of counts) {
    lines.push(`- Unsupported ${language} files changed: ${count}. ${language} dependency analysis is not supported in this version.`);
  }
  if (mode === "pr" && counts.length > 0) lines.push("- Unsupported language areas are scope limitations, not no-risk areas.");
  return lines;
}

function formatLanguages(languages: string[]): string {
  if (languages.length === 0) return "recorded";
  if (languages.includes("typescript") && languages.includes("javascript") && languages.length === 2) return "TypeScript/JavaScript";
  return languages.join("/");
}

function unsupportedLanguageCounts(diff: ArchitectureDiff): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const node of [...diff.addedNodes, ...diff.removedNodes, ...diff.changedNodes]) {
    const label = unsupportedLanguageLabel(node);
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function unsupportedLanguageLabel(node: ArchitectureNode): string | undefined {
  if (node.language === "typescript" || node.language === "javascript") return undefined;
  if (node.language === "python" || node.path.endsWith(".py")) return "Python";
  if (node.language === "go" || node.path.endsWith(".go")) return "Go";
  if (node.language === "java" || node.path.endsWith(".java")) return "Java";
  if (node.language === "csharp" || node.path.endsWith(".cs")) return "C#";
  if (node.language === "ruby" || node.path.endsWith(".rb")) return "Ruby";
  if (node.language === "php" || node.path.endsWith(".php")) return "PHP";
  return undefined;
}

function changedUnsupportedLanguagePaths(diff: ArchitectureDiff): string[] {
  return [...diff.addedNodes, ...diff.removedNodes, ...diff.changedNodes]
    .filter((node) => unsupportedLanguageLabel(node) !== undefined)
    .map((node) => node.path)
    .sort();
}

function buildReviewRationale(diff: ArchitectureDiff): string[] {
  const changedOrAdded = new Set([...diff.addedNodes, ...diff.changedNodes].map((node) => node.path));
  const importersByTarget = groupedTargets(diff.addedEdges.filter((edge) => changedOrAdded.has(edge.from)));
  const rationale: string[] = [];
  for (const [target, importers] of [...importersByTarget.entries()].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))) {
    if (importers.size < 2) continue;
    const routeImporters = [...importers].filter((path) => /\/routes?\//.test(path));
    const reason = routeImporters.length >= 2 ? `it is imported by ${routeImporters.length} changed route modules` : `it is imported by ${importers.size} changed modules`;
    rationale.push(`\`${target}\` ranked early because ${reason}.`);
  }
  return rationale;
}

function groupedTargets(edges: ArchitectureDiff["addedEdges"]): Map<string, Set<string>> {
  const groups = new Map<string, Set<string>>();
  for (const edge of edges) {
    const importers = groups.get(edge.to) ?? new Set<string>();
    importers.add(edge.from);
    groups.set(edge.to, importers);
  }
  return groups;
}

function importersMatching(importers: Set<string>, pattern: RegExp): boolean {
  return [...importers].every((path) => pattern.test(path));
}

function isEntrypoint(pathName: string): boolean {
  return /(^|\/)(main|index|app)\.[cm]?[jt]sx?$/.test(pathName.toLowerCase());
}

function moduleName(pathName: string): string {
  return pathName.split("/").pop() ?? pathName;
}

function compareNodePath(a: ArchitectureNode, b: ArchitectureNode): number {
  return a.path.localeCompare(b.path);
}

function hasWorkflowChange(diff: ArchitectureDiff): boolean {
  return [...diff.addedNodes, ...diff.removedNodes, ...diff.changedNodes].some((node) => node.kind === "workflow" || node.kind === "config" || node.riskTags.includes("operations-sensitive"));
}
