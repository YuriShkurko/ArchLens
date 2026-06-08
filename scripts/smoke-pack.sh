#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pack_dir="$(mktemp -d -t archlens-pack-XXXXXX)"
test_dir="$(mktemp -d -t archlens-smoke-XXXXXX)"

cleanup() {
  rm -rf "$pack_dir" "$test_dir"
}
trap cleanup EXIT

cd "$repo_root"
pnpm --filter @archlens/core build
pnpm --filter @archlens/cli build
(cd packages/core && pnpm pack --pack-destination "$pack_dir" >/dev/null)
(cd apps/cli && pnpm pack --pack-destination "$pack_dir" >/dev/null)

core_tgz="$(ls "$pack_dir"/archlens-core-*.tgz | head -n 1)"
cli_tgz="$(ls "$pack_dir"/archlens-cli-*.tgz | head -n 1)"

cd "$test_dir"
git init --quiet
git config user.email "archlens-smoke@example.invalid"
git config user.name "ArchLens Smoke Test"
npm init -y >/dev/null
npm install --silent "$core_tgz" "$cli_tgz"

mkdir -p src
cat > src/util.ts <<'TS'
export function greeting(name: string): string {
  return `hello ${name}`;
}
TS
cat > src/index.ts <<'TS'
import { greeting } from "./util";

export const message = greeting("archlens");
TS

git add src package.json package-lock.json
git commit --quiet -m "initial app"

cat > src/format.ts <<'TS'
export function shout(value: string): string {
  return value.toUpperCase();
}
TS
cat > src/index.ts <<'TS'
import { shout } from "./format";
import { greeting } from "./util";

export const message = shout(greeting("archlens"));
TS

git add src
git commit --quiet -m "add formatter"

./node_modules/.bin/archlens --help >/dev/null
./node_modules/.bin/archlens snapshot >/dev/null
./node_modules/.bin/archlens diff --base HEAD~1 --head HEAD >/dev/null
./node_modules/.bin/archlens render --mode pr >/dev/null
test -s .archlens/architecture-impact.md

echo "Pack smoke test passed in $test_dir"
