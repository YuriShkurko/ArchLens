import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { scanImports } from "../importScanner.js";

const fixtureRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures/sample");

describe("scanImports", () => {
  it("extracts and resolves relative TypeScript imports", () => {
    const imports = scanImports(path.join(fixtureRoot, "src/app/main.ts"), fixtureRoot);
    expect(imports).toEqual([
      {
        sourcePath: "src/app/main.ts",
        specifier: "../core/math",
        kind: "import",
        resolvedPath: "src/core/math.ts",
        external: false,
      },
    ]);
  });
});
