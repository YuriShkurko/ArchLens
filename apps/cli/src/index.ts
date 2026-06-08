#!/usr/bin/env node
import { Command } from "commander";
import { writeDiff, writeReport, writeSnapshot } from "@archlens/core";

const program = new Command();

program
  .name("archlens")
  .description("Local-first architecture-impact reports for repositories.")
  .version("0.2.2")
  .showHelpAfterError()
  .addHelpText(
    "after",
    `
Examples:
  archlens snapshot
  archlens diff --base main --head HEAD
  archlens render --mode pr

Outputs are written under .archlens/ in the current git repository.
Run archlens <command> --help for command-specific details.`,
  );

program
  .command("snapshot")
  .description("Scan the current git repository and write .archlens/snapshot.json")
  .addHelpText(
    "after",
    `
Output:
  .archlens/snapshot.json

Run this from a git repository root or subdirectory.`,
  )
  .action(async () => {
    const out = await writeSnapshot(process.cwd());
    console.log(`Wrote ${out}`);
  });

program
  .command("diff")
  .description("Compare architecture facts between two git refs and write .archlens/architecture-diff.json")
  .requiredOption("--base <ref>", "base git ref to compare from, for example main or HEAD~1")
  .requiredOption("--head <ref>", "head git ref to compare to, for example HEAD")
  .addHelpText(
    "after",
    `
Output:
  .archlens/architecture-diff.json

Examples:
  archlens diff --base main --head HEAD
  archlens diff --base HEAD~1 --head HEAD`,
  )
  .action(async (opts: { base: string; head: string }) => {
    const out = await writeDiff(opts.base, opts.head, process.cwd());
    console.log(`Wrote ${out}`);
  });

program
  .command("render")
  .description("Render .archlens/architecture-impact.md from .archlens/architecture-diff.json")
  .option("--author-note <text>", "optional author-provided context to include in the report")
  .option("--mode <mode>", "report detail mode: pr or full", "pr")
  .addHelpText(
    "after",
    `
Modes:
  pr    Compact PR-ready report (default)
  full  Detailed report with full node/edge lists and Mermaid details

Output:
  .archlens/architecture-impact.md

Run archlens diff before render so .archlens/architecture-diff.json exists.`,
  )
  .action(async (opts: { authorNote?: string; mode: string }) => {
    if (opts.mode !== "pr" && opts.mode !== "full") throw new Error("--mode must be 'pr' or 'full'");
    const out = await writeReport(process.cwd(), opts.authorNote, opts.mode);
    console.log(`Wrote ${out}`);
  });

const argv = process.argv[2] === "--" ? [process.argv[0] ?? "node", process.argv[1] ?? "archlens", ...process.argv.slice(3)] : process.argv;

program.parseAsync(argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`archlens: ${message}`);
  process.exitCode = 1;
});
