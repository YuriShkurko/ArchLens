import { edgeLabel, renderMermaid } from "./renderMermaid.js";
import type { ArchitectureDiff } from "./schema.js";

export interface RenderOptions {
  authorNote?: string;
}

export function renderMarkdown(diff: ArchitectureDiff, options: RenderOptions = {}): string {
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
  lines.push(...analyzerScopeLines(diff), "");

  lines.push("## Architecture story", "");
  sectionList(lines, undefined, buildArchitectureStory(diff), { plain: true, emptyText: "No structural story patterns detected from the current dependency facts." });

  lines.push("## Detected facts", "");
  sectionList(lines, "### Added files or modules", diff.addedNodes.map(formatNodeFact));
  sectionList(lines, "### Removed files or modules", diff.removedNodes.map(formatNodeFact));
  sectionList(lines, "### Changed files or modules", diff.changedNodes.map(formatNodeFact));
  sectionList(lines, "### Added dependency edges", diff.addedEdges.map(edgeLabel));
  sectionList(lines, "### Removed dependency edges", diff.removedEdges.map(edgeLabel));

  lines.push("## Inferred risk signals", "");
  if (diff.riskSignals.length === 0) {
    lines.push("- No risk signals detected by the current deterministic rules.", "");
  } else {
    for (const signal of diff.riskSignals) {
      lines.push(`- **${signal.level.toUpperCase()} — ${signal.title}** (${signal.kind})`);
      lines.push(`  - ${signal.detail}`);
      if (signal.paths.length > 0) lines.push(`  - Paths: ${signal.paths.map((p) => `\`${p}\``).join(", ")}`);
    }
    lines.push("");
  }

  lines.push("## Tests", "");
  renderTestsSection(lines, diff);

  lines.push("## Suggested review order", "");
  lines.push("Risk-first, deterministic order: high-risk config/workflow/deployment/security paths; central changed files and shared dependencies; dependency-edge participants; changed source; tests; then docs.", "");
  sectionList(lines, undefined, diff.reviewOrder);

  if (mermaid) {
    lines.push("## Mermaid dependency diagram", "");
    lines.push("```mermaid", mermaid, "```", "");
  } else {
    lines.push("## Mermaid dependency diagram", "", "- No new dependency edges detected, so no dependency-edge diagram was generated.", "");
  }

  lines.push("## Author-provided context", "");
  lines.push(options.authorNote?.trim() ? options.authorNote.trim() : "- No author note provided.", "");

  lines.push("## Appendix: limitations and caveats", "");
  lines.push("- ArchLens does not know author intent or whether CI, tests, or deployment workflows have passed unless that evidence is provided separately.");
  if (hasWorkflowChange(diff)) lines.push("- A workflow/config/package/deployment file changed; verify the relevant local command or CI job before merge.");
  lines.push("- Dependency and related-test inference currently comes from language-specific analyzers; v0.1.x ships TypeScript/JavaScript first.");
  lines.push("- TypeScript path aliases and non-relative imports may be unresolved in v0.1.");
  lines.push("- Dynamic imports are only detected when the specifier is a string literal.");
  lines.push("- Risk signals are deterministic heuristics, not proof of bugs.", "");
  return lines.join("\n");
}

function sectionList(lines: string[], heading: string | undefined, items: string[], options: { plain?: boolean; emptyText?: string } = {}) {
  if (heading) lines.push(heading, "");
  if (items.length === 0) lines.push(`- ${options.emptyText ?? "None detected."}`, "");
  else lines.push(...items.map((item) => options.plain ? `- ${item}` : `- \`${item}\``), "");
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

function renderTestsSection(lines: string[], diff: ArchitectureDiff): void {
  sectionList(lines, "### Changed test files", diff.changedTestFiles);
  sectionList(lines, "### Potential related existing tests", diff.potentialRelatedTests, { emptyText: "No related existing tests found by TypeScript/JavaScript path heuristics." });

  const unsupported = changedUnsupportedLanguagePaths(diff);
  lines.push("### Unsupported related-test inference", "");
  if (unsupported.length === 0) {
    lines.push("- No changed files requiring unsupported-language related-test inference were detected.", "");
  } else {
    lines.push("- Unsupported language areas are listed as scope limitations, not as no-risk areas.");
    lines.push("- Related-test inference is unavailable for these changed non-TypeScript/JavaScript paths in v0.1:");
    lines.push(...unsupported.map((path) => `  - \`${path}\``), "");
  }
}

function analyzerScopeLines(diff: ArchitectureDiff): string[] {
  const names = diff.analyzers.map((analyzer) => analyzer.name).sort();
  const languages = [...new Set(diff.analyzers.flatMap((analyzer) => analyzer.languages))].sort();
  const lines = names.length > 0
    ? [`- ArchLens analyzed ${formatLanguages(languages)} architecture facts in this repository.`, `- Active analyzer metadata: ${names.map((name) => `\`${name}\``).join(", ")}.`]
    : ["- No analyzer metadata was recorded for this diff."];
  const unsupportedLanguages = changedUnsupportedLanguages(diff);
  if (unsupportedLanguages.length > 0) lines.push(`- ${unsupportedLanguages.join(", ")} files changed, but ${unsupportedLanguages.join("/")} dependency analysis is not supported in this version.`);
  return lines;
}

function formatLanguages(languages: string[]): string {
  if (languages.length === 0) return "recorded";
  if (languages.includes("typescript") && languages.includes("javascript") && languages.length === 2) return "TypeScript/JavaScript";
  return languages.join("/");
}

function changedUnsupportedLanguages(diff: ArchitectureDiff): string[] {
  const labels = new Set<string>();
  for (const node of [...diff.addedNodes, ...diff.removedNodes, ...diff.changedNodes]) {
    if (node.language === "python") labels.add("Python");
    else if (node.language === "go") labels.add("Go");
    else if (node.language === "java") labels.add("Java");
    else if (node.language === "csharp") labels.add("C#");
    else if (node.language === "ruby") labels.add("Ruby");
    else if (node.language === "php") labels.add("PHP");
  }
  return [...labels].sort();
}

function changedUnsupportedLanguagePaths(diff: ArchitectureDiff): string[] {
  return [...diff.addedNodes, ...diff.removedNodes, ...diff.changedNodes]
    .filter((node) => node.language !== "typescript" && node.language !== "javascript" && /\.(py|rs|go|java|kt|rb|php|cs|swift|c|cc|cpp|h|hpp)$/i.test(node.path))
    .map((node) => node.path)
    .sort();
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

function hasWorkflowChange(diff: ArchitectureDiff): boolean {
  return [...diff.addedNodes, ...diff.removedNodes, ...diff.changedNodes].some((node) => node.kind === "workflow" || node.kind === "config" || node.riskTags.includes("operations-sensitive"));
}
