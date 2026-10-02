import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(serverDir, "../../../../");
const output = resolve(repoRoot, "engine/bin", process.platform === "win32" ? "gateway_engine.exe" : "gateway_engine");
const compiler = process.env.C_COMPILER || "gcc";
const sources = ["engine.c", "queue.c", "stack.c", "list.c", "linkedlist.c", "tree.c", "request.c"]
  .map((file) => resolve(repoRoot, "engine/src", file));

mkdirSync(dirname(output), { recursive: true });
const result = spawnSync(compiler, ["-std=c11", "-O2", "-Wall", "-Wextra", "-Werror", `-I${resolve(repoRoot, "engine/include")}`, ...sources, "-o", output], { stdio: "inherit" });

if (result.error) {
  console.error(`Unable to execute C compiler '${compiler}': ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
console.log(`Built native gateway engine at ${output}`);