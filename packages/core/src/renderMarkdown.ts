import { edgeLabel, renderMermaid } from "./renderMermaid.js";
import type { ArchitectureDiff } from "./schema.js";

export interface RenderOptions {
  authorNote?: string;
}

export function renderMarkdown(diff: ArchitectureDiff, options: RenderOptions = {}): string {
  const mermaid = renderMermaid(diff);
  const lines: string[] = [];
  lines.push("# Architecture Impact Report", "");
  lines.push("> ArchLens reports detected structural facts and deterministic architecture-risk signals. It does not infer author intent and is not a PR summary.", "");

  lines.push("## Summary of detected structural changes", "");
  lines.push(`- Base: \`${diff.base}\``);
  lines.push(`- Head: \`${diff.head}\``);
  lines.push(`- Added files/modules: ${diff.addedNodes.length}`);
  lines.push(`- Removed files/modules: ${diff.removedNodes.length}`);
  lines.push(`- Changed files/modules: ${diff.changedNodes.length}`);
  lines.push(`- Added dependency edges: ${diff.addedEdges.length}`);
  lines.push(`- Removed dependency edges: ${diff.removedEdges.length}`, "");

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

  lines.push("## Boundary/risk signals", "");
  const boundarySignals = diff.riskSignals.filter((signal) => signal.kind.includes("boundary") || signal.kind === "layering" || signal.kind === "dependency-graph");
  if (boundarySignals.length === 0) lines.push("- No dependency-boundary or layering signals detected.", "");
  else {
    for (const signal of boundarySignals) lines.push(`- ${signal.title}: ${signal.detail}`);
    lines.push("");
  }

  lines.push("## Tests", "");
  sectionList(lines, "### Changed test files", diff.changedTestFiles);
  sectionList(lines, "### Potential related existing tests", diff.potentialRelatedTests);

  lines.push("## Suggested review order", "");
  lines.push("Risk-first, deterministic order: high-risk paths, config/workflow/deployment files, dependency-edge participants, changed source, tests, then docs.", "");
  sectionList(lines, undefined, diff.reviewOrder);

  if (mermaid) {
    lines.push("## Mermaid dependency diagram", "");
    lines.push("```mermaid", mermaid, "```", "");
  } else {
    lines.push("## Mermaid dependency diagram", "", "- No new dependency edges detected, so no dependency-edge diagram was generated.", "");
  }

  lines.push("## Author-provided context", "");
  lines.push(options.authorNote?.trim() ? options.authorNote.trim() : "- No author note provided.", "");

  lines.push("## Unknowns", "");
  lines.push("- ArchLens does not know author intent.");
  lines.push("- ArchLens does not know whether CI, tests, or deployment workflows have passed unless that evidence is provided separately.");
  if (hasWorkflowChange(diff)) lines.push("- A workflow/config file changed; verify the relevant GitHub Actions run or local validation result before merge.");
  lines.push("- TypeScript path aliases and non-relative imports may be unresolved in v0.1.");
  lines.push("- Dynamic imports are only detected when the specifier is a string literal.");
  lines.push("- Risk signals are deterministic heuristics, not proof of bugs.", "");

  return lines.join("\n");
}

function sectionList(lines: string[], heading: string | undefined, items: string[]) {
  if (heading) lines.push(heading, "");
  if (items.length === 0) lines.push("- None detected.", "");
  else lines.push(...items.map((item) => `- \`${item}\``), "");
}

function formatNodeFact(node: ArchitectureDiff["addedNodes"][number]): string {
  const tags = node.riskTags.length > 0 ? ` — ${node.riskTags.join(", ")}` : "";
  return `${node.path} (${node.kind}, ${node.language}${tags})`;
}

function hasWorkflowChange(diff: ArchitectureDiff): boolean {
  return [...diff.addedNodes, ...diff.removedNodes, ...diff.changedNodes].some((node) => node.kind === "workflow" || node.kind === "config" || node.riskTags.includes("operations-sensitive"));
}
