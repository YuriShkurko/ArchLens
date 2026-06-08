import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractPythonImportSpecifiers, scanPythonImports } from "../analyzers/python/importScanner.js";

function makeRepo(): string {
  return mkdtempSync(path.join(tmpdir(), "archlens-python-"));
}

function write(root: string, rel: string, content: string) {
  const full = path.join(root, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content);
}

describe("python import scanner", () => {
  it("extracts common Python import forms deterministically", () => {
    const text = [
      "import x.y",
      "import x.y as z",
      "from x.y import z",
      "from .module import thing",
      "from ..package.module import thing",
    ].join("\n");

    expect(extractPythonImportSpecifiers(text)).toEqual([
      "x.y",
      "x.y.z",
      ".module",
      ".module.thing",
      "..package.module",
      "..package.module.thing",
    ]);
  });

  it("ignores import-looking lines inside triple-quoted generated code strings", () => {
    const text = [
      "def template():",
      "    return '''",
      "        from app import models",
      "        import app.database",
      "    '''",
      "from real.module import Thing",
    ].join("\n");

    expect(extractPythonImportSpecifiers(text)).toEqual(["real.module", "real.module.Thing"]);
  });

  it("resolves modules to .py, __init__.py, backend/src roots, and basic relative imports", () => {
    const root = makeRepo();
    write(root, "backend/src/ai_job_radar/__init__.py", "");
    write(root, "backend/src/ai_job_radar/config/__init__.py", "");
    write(root, "backend/src/ai_job_radar/config/settings.py", "class Settings: pass\n");
    write(root, "backend/src/ai_job_radar/interfaces/api/routers/__init__.py", "");
    write(root, "backend/src/ai_job_radar/interfaces/api/routers/schemas.py", "class Foo: pass\n");
    write(root, "backend/src/ai_job_radar/interfaces/api/routers/jobs.py", [
      "from ai_job_radar.config.settings import Settings",
      "from .schemas import Foo",
    ].join("\n"));

    const imports = scanPythonImports(path.join(root, "backend/src/ai_job_radar/interfaces/api/routers/jobs.py"), root);
    expect(imports.map((record) => record.resolvedPath).filter(Boolean)).toContain("backend/src/ai_job_radar/config/settings.py");
    expect(imports.map((record) => record.resolvedPath).filter(Boolean)).toContain("backend/src/ai_job_radar/interfaces/api/routers/schemas.py");
  });

  it("resolves dogfood-proven app and backend source roots", () => {
    const root = makeRepo();
    write(root, "backend/app/__init__.py", "");
    write(root, "backend/app/services/__init__.py", "");
    write(root, "backend/app/services/place_service.py", "class PlaceService: pass\n");
    write(root, "backend/tests/test_place_service.py", "from app.services.place_service import PlaceService\n");

    const imports = scanPythonImports(path.join(root, "backend/tests/test_place_service.py"), root);
    expect(imports.map((record) => record.resolvedPath).filter(Boolean)).toContain("backend/app/services/place_service.py");
  });
});
