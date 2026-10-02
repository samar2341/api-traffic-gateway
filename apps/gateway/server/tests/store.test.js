import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addBlockedSource,
  getEvents,
  getMetrics,
  getRules,
  getStoreMode,
  isSourceBlocked,
  removeRule,
  saveEvent,
  saveRequest,
  saveRule,
} from "../src/services/store.js";

test("development store tracks request totals and decisions", async () => {
  assert.equal(getStoreMode(), "memory");
  const before = await getMetrics();
  const timestamp = new Date();
  await saveRequest({ id: "unit-allowed", timestamp, source: "test", method: "GET", endpoint: "/api/test", decision: "ALLOW", status: "processed", responseCode: 200, latencyMs: 2, eventType: null, reason: "test" });
  await saveRequest({ id: "unit-invalid", timestamp, source: "test", method: "GET", endpoint: "/bad", decision: "BLOCK", status: "rejected", responseCode: 400, latencyMs: 3, eventType: "INVALID_REQUEST", reason: "test" });
  const after = await getMetrics();
  assert.equal(after.totalRequests, before.totalRequests + 2);
  assert.equal(after.allowedRequests, before.allowedRequests + 1);
  assert.equal(after.blockedRequests, before.blockedRequests + 1);
  assert.equal(after.invalidRequests, before.invalidRequests + 1);
});

test("events can be filtered and rules can be updated and removed", async () => {
  await saveEvent({ timestamp: new Date(), eventType: "SQL_INJECTION", source: "unit-source", endpoint: "/api/test", action: "BLOCK", severity: "high", details: "test event" });
  const events = await getEvents({ eventType: "SQL_INJECTION", source: "unit-source" });
  assert.equal(events.length, 1);
  const rule = await saveRule({ ruleName: "Unit pattern", ruleType: "SQL_INJECTION", pattern: "unit-pattern", action: "BLOCK", enabled: true });
  assert.ok((await getRules()).some((item) => item.id === rule.id));
  assert.equal(await removeRule(rule.id), true);
  assert.equal((await getRules()).some((item) => item.id === rule.id), false);
});

test("temporary source blocks expire", async () => {
  await addBlockedSource("unit-blocked", "test", new Date(Date.now() + 10000));
  assert.equal(await isSourceBlocked("unit-blocked"), true);
  await addBlockedSource("unit-expired", "test", new Date(Date.now() - 1000));
  assert.equal(await isSourceBlocked("unit-expired"), false);
});