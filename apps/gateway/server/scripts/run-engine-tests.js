import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(serverDir, "../../..");
const output = resolve(repoRoot, "engine/bin", process.platform === "win32" ? "engine_tests.exe" : "engine_tests");
const sources = ["queue.c", "stack.c", "list.c", "linkedlist.c", "tree.c", "request.c"].map((file) => resolve(repoRoot, "engine/src", file));
const testSource = resolve(repoRoot, "engine/tests/test_structures.c");

mkdirSync(dirname(output), { recursive: true });
const build = spawnSync(process.env.C_COMPILER || "gcc", ["-std=c11", "-O2", "-Wall", "-Wextra", "-Werror", `-I${resolve(repoRoot, "engine/include")}`, testSource, ...sources, "-o", output], { stdio: "inherit" });
if (build.error) {
  console.error(`Unable to execute C compiler: ${build.error.message}`);
  process.exit(1);
}
if (build.status !== 0) process.exit(build.status ?? 1);
const test = spawnSync(output, [], { stdio: "inherit" });
if (test.error) {
  console.error(`Unable to execute C DSA tests: ${test.error.message}`);
  process.exit(1);
}
process.exit(test.status ?? 1);
