import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = resolve(fileURLToPath(new URL("..", import.meta.url)), "..");
const repoRoot = resolve(serverDir, "../../..");
const defaultBinary = resolve(repoRoot, "engine/bin", process.platform === "win32" ? "gateway_engine.exe" : "gateway_engine");

export class NativeEngineError extends Error {
  constructor(message) {
    super(message);
    this.status = 503;
    this.code = "NATIVE_ENGINE_UNAVAILABLE";
  }
}

export class NativeEngine {
  #child;
  #readline;
  #pending = [];
  #tail = Promise.resolve();
  #closed = false;
  #lastMetrics = { queueLength: 0, totalEnqueued: 0, totalDequeued: 0, stackSize: 0, historySize: 0, routeCount: 0, topEvent: null };

  start() {
    const binary = process.env.NATIVE_ENGINE_PATH || defaultBinary;
    if (!existsSync(binary))
      throw new NativeEngineError(`Native C engine is missing at ${binary}. Run the gateway server build:engine script.`);
    this.#child = spawn(binary, [], { stdio: ["pipe", "pipe", "inherit"] });
    this.#readline = createInterface({ input: this.#child.stdout });
    this.#readline.on("line", (line) => this.#handleLine(line));
    this.#child.on("error", (error) => this.#failAll(new NativeEngineError(error.message)));
    this.#child.on("close", (code) => {
      this.#closed = true;
      this.#failAll(new NativeEngineError(`Native C engine exited (${code ?? "unknown"}).`));
    });
    return binary;
  }

  #handleLine(line) {
    const pending = this.#pending.shift();
    if (!pending) return;
    clearTimeout(pending.timer);
    const fields = line.split("\t");
    if (fields[0] === "RULE_OK") {
      pending.resolve({ ruleCount: Number(fields[1] || 0) });
      return;
    }
    if (fields.length < 11) {
      pending.reject(new NativeEngineError("Native C engine returned a malformed decision record."));
      return;
    }
    this.#lastMetrics = {
      queueLength: Number(fields[4]),
      totalEnqueued: Number(fields[5]),
      totalDequeued: Number(fields[6]),
      stackSize: Number(fields[7]),
      historySize: Number(fields[8]),
      routeCount: Number(fields[9]),
      topEvent: fields[10] || null,
    };
    pending.resolve({
      decision: fields[0],
      statusCode: Number(fields[1]),
      eventType: fields[2],
      reason: fields[3],
      metrics: this.#lastMetrics,
    });
  }

  #failAll(error) {
    for (const pending of this.#pending.splice(0)) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
  }

  #send(line) {
    const operation = this.#tail.then(() => new Promise((resolve, reject) => {
      if (this.#closed || !this.#child?.stdin.writable) {
        reject(new NativeEngineError("Native C engine is not running."));
        return;
      }
      const pending = { resolve, reject, timer: null };
      pending.timer = setTimeout(() => {
        const index = this.#pending.indexOf(pending);
        if (index >= 0) this.#pending.splice(index, 1);
        this.#closed = true;
        this.#child.kill();
        reject(new NativeEngineError("Native C engine did not respond in time."));
      }, 5000);
      this.#pending.push(pending);
      this.#child.stdin.write(`${line}\n`, (error) => {
        if (error) {
          const index = this.#pending.indexOf(pending);
          if (index >= 0) this.#pending.splice(index, 1);
          clearTimeout(pending.timer);
          reject(new NativeEngineError(error.message));
        }
      });
    }));
    this.#tail = operation.catch(() => {});
    return operation;
  }

  evaluate({ id, source, method, endpoint, authenticated, admin, blocked = false, input }) {
    const values = [id, source, method, endpoint, authenticated ? "1" : "0", admin ? "1" : "0", blocked ? "1" : "0", input]
      .map((value) => String(value ?? "").replace(/[\t\r\n]/g, " "));
    return this.#send(values.join("\t"));
  }

  async syncRules(rules) {
    await this.#send("RULE\tCLEAR");
    let count = 0;
    for (const rule of rules) {
      if (rule.enabled && rule.ruleType === "SQL_INJECTION" && rule.action === "BLOCK" && rule.pattern.trim()) {
        const pattern = rule.pattern.replace(/[\t\r\n]/g, " ").slice(0, 95);
        await this.#send(`RULE\tADD\t${pattern}`);
        count++;
      }
    }
    return count;
  }

  metrics() {
    return { ...this.#lastMetrics };
  }

  stop() {
    this.#closed = true;
    this.#child?.stdin.end();
  }
}