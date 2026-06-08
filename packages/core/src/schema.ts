import { z } from "zod";

export const ArchitectureNodeKindSchema = z.enum(["source", "test", "config", "docs", "workflow", "unknown"]);
export type ArchitectureNodeKind = z.infer<typeof ArchitectureNodeKindSchema>;

export const ArchitectureNodeSchema = z.object({
  id: z.string(),
  path: z.string(),
  kind: ArchitectureNodeKindSchema,
  language: z.string(),
  riskTags: z.array(z.string()),
  contentHash: z.string().optional(),
});
export type ArchitectureNode = z.infer<typeof ArchitectureNodeSchema>;

export const ArchitectureEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  kind: z.enum(["import", "dynamic", "unknown"]),
  sourcePath: z.string(),
});
export type ArchitectureEdge = z.infer<typeof ArchitectureEdgeSchema>;

export const AnalyzerMetadataSchema = z.object({
  name: z.string(),
  languages: z.array(z.string()),
  fileExtensions: z.array(z.string()),
  capabilities: z.array(z.string()),
  limitations: z.array(z.string()),
});
export type AnalyzerMetadata = z.infer<typeof AnalyzerMetadataSchema>;

export const ArchitectureSnapshotSchema = z.object({
  version: z.string(),
  createdAt: z.string(),
  repoRoot: z.string(),
  analyzers: z.array(AnalyzerMetadataSchema),
  nodes: z.array(ArchitectureNodeSchema),
  edges: z.array(ArchitectureEdgeSchema),
  stats: z.object({
    nodeCount: z.number(),
    edgeCount: z.number(),
    sourceCount: z.number(),
    testCount: z.number(),
    externalImportCount: z.number(),
  }),
});
export type ArchitectureSnapshot = z.infer<typeof ArchitectureSnapshotSchema>;

export const RiskSignalSchema = z.object({
  id: z.string(),
  title: z.string(),
  level: z.enum(["info", "warning", "high"]),
  kind: z.string(),
  paths: z.array(z.string()),
  detail: z.string(),
});
export type RiskSignal = z.infer<typeof RiskSignalSchema>;

export const ArchitectureDiffSchema = z.object({
  version: z.string(),
  createdAt: z.string(),
  base: z.string(),
  head: z.string(),
  addedNodes: z.array(ArchitectureNodeSchema),
  removedNodes: z.array(ArchitectureNodeSchema),
  changedNodes: z.array(ArchitectureNodeSchema),
  addedEdges: z.array(ArchitectureEdgeSchema),
  removedEdges: z.array(ArchitectureEdgeSchema),
  analyzers: z.array(AnalyzerMetadataSchema),
  riskSignals: z.array(RiskSignalSchema),
  reviewOrder: z.array(z.string()),
  changedTestFiles: z.array(z.string()),
  potentialRelatedTests: z.array(z.string()),
  stats: z.object({
    addedNodeCount: z.number(),
    removedNodeCount: z.number(),
    changedNodeCount: z.number(),
    addedEdgeCount: z.number(),
    removedEdgeCount: z.number(),
  }),
});
export type ArchitectureDiff = z.infer<typeof ArchitectureDiffSchema>;

export const ARCHLENS_VERSION = "0.1";
