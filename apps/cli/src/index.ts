#!/usr/bin/env node
import { Command } from "commander";
import { writeDiff, writeReport, writeSnapshot } from "@archlens/core";

const program = new Command();

program
  .name("archlens")
  .description("See how every code change affects your architecture.")
  .version("0.1.0");

program
  .command("snapshot")
  .description("Scan the current repo and write .archlens/snapshot.json")
  .action(async () => {
    const out = await writeSnapshot(process.cwd());
    console.log(`Wrote ${out}`);
  });

program
  .command("diff")
  .description("Compare architecture-related information between two git refs")
  .option("--base <ref>", "base git ref", "main")
  .option("--head <ref>", "head git ref", "HEAD")
  .action(async (opts: { base: string; head: string }) => {
    const out = await writeDiff(opts.base, opts.head, process.cwd());
    console.log(`Wrote ${out}`);
  });

program
  .command("render")
  .description("Render .archlens/architecture-impact.md from architecture-diff.json")
  .option("--author-note <text>", "optional author-provided context to include in the report")
  .action(async (opts: { authorNote?: string }) => {
    const out = await writeReport(process.cwd(), opts.authorNote);
    console.log(`Wrote ${out}`);
  });

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`archlens: ${message}`);
  process.exitCode = 1;
});
