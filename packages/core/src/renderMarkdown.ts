import { edgeLabel, renderMermaid } from "./renderMermaid.js";
import type { ArchitectureDiff } from "./schema.js";

export interface RenderOptions {
  authorNote?: string;
}

export function renderMarkdown(diff: ArchitectureDiff, options: RenderOptions = {}): string {
  const mermaid = renderMermaid(diff);
  const lines: string[] = [];
  lines.push("# Architecture Impact Report", "");
  lines.push("> ArchLens reports detected structural changes and inferred architecture risk. It does not infer author intent and is not a PR summary.", "");

  lines.push("## Summary of detected structural changes", "");
  lines.push(`- Base: \`${diff.base}\``);
  lines.push(`- Head: \`${diff.head}\``);
  lines.push(`- Added files/modules: ${diff.addedNodes.length}`);
  lines.push(`- Removed files/modules: ${diff.removedNodes.length}`);
  lines.push(`- Changed files/modules: ${diff.changedNodes.length}`);
  lines.push(`- Added dependency edges: ${diff.addedEdges.length}`);
  lines.push(`- Removed dependency edges: ${diff.removedEdges.length}`, "");

  lines.push("## Detected facts", "");
  sectionList(lines, "### Added files or modules", diff.addedNodes.map((node) => node.path));
  sectionList(lines, "### Removed files or modules", diff.removedNodes.map((node) => node.path));
  sectionList(lines, "### Changed modules", diff.changedNodes.map((node) => node.path));
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
  const boundarySignals = diff.riskSignals.filter((signal) => signal.kind.includes("boundary") || signal.kind === "layering");
  if (boundarySignals.length === 0) lines.push("- No boundary-specific signals detected.", "");
  else {
    for (const signal of boundarySignals) lines.push(`- ${signal.title}: ${signal.detail}`);
    lines.push("");
  }

  lines.push("## Related test files, if detected", "");
  const testFiles = [...diff.addedNodes, ...diff.changedNodes, ...diff.removedNodes].filter((node) => node.kind === "test").map((node) => node.path);
  sectionList(lines, undefined, testFiles);

  lines.push("## Suggested review order", "");
  sectionList(lines, undefined, diff.reviewOrder);

  if (mermaid) {
    lines.push("## Mermaid dependency diagram", "");
    lines.push("```mermaid", mermaid, "```", "");
  }

  lines.push("## Author-provided context", "");
  lines.push(options.authorNote?.trim() ? options.authorNote.trim() : "- No author note provided.", "");

  lines.push("## Unknowns", "");
  lines.push("- ArchLens does not know author intent.");
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
