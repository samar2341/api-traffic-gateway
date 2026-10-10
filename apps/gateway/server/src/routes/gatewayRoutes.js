import { Router } from "express";
import jwt from "jsonwebtoken";
import { createGatewayMiddleware } from "../middleware/gateway.js";
import { requireAdmin, requireAuthentication } from "../middleware/authentication.js";
import { validateApiRequest } from "../middleware/validation.js";
import {
  addBlockedSource,
  getBlockedSources,
  getEvents,
  getMetrics,
  getRequests,
  getRules,
  getStoreMode,
  removeRule,
  saveRule,
} from "../services/store.js";

export function createGatewayRoutes({ engine, io }) {
  const router = Router();
  const gateway = createGatewayMiddleware({ engine, io });

  router.get("/api/health", (_req, res) => res.json({ status: "ok", service: "api-traffic-gateway", storage: getStoreMode(), nativeEngine: true }));

  router.post("/api/auth/token", (_req, res) => {
    const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { sub: "anonymous", expiresIn: "8h" });
    res.json({ token, tokenType: "Bearer", expiresInSeconds: 28800, role: "admin" });
  });

  router.get("/api/test", validateApiRequest, gateway, (req, res) => {
    res.json({ success: true, message: "Request processed successfully", requestId: req.gatewayRequestId, method: req.method, query: req.query });
  });
  router.post("/api/test", validateApiRequest, gateway, (req, res) => {
    res.json({ success: true, message: "Request processed successfully", requestId: req.gatewayRequestId, received: req.body });
  });
  router.all("/api/protected", validateApiRequest, gateway, (req, res) => {
    res.json({ success: true, message: "Protected API processed the request", requestId: req.gatewayRequestId, method: req.method, received: req.body ?? null });
  });
  router.all("/api/admin", validateApiRequest, gateway, (_req, res) => {
    res.json({ success: true, message: "Administrator protected API processed the request" });
  });

  router.get("/api/metrics", requireAuthentication, async (_req, res, next) => {
    try { res.json({ ...(await getMetrics()), engine: engine.metrics(), storage: getStoreMode() }); }
    catch (error) { next(error); }
  });
  router.get("/api/requests", requireAuthentication, async (req, res, next) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
      res.json({ requests: await getRequests(limit) });
    } catch (error) { next(error); }
  });
  router.get("/api/security/events", requireAuthentication, async (req, res, next) => {
    try {
      const filters = Object.fromEntries(["eventType", "action", "severity", "source"].map((key) => [key, String(req.query[key] || "")]));
      res.json({ events: await getEvents(filters) });
    } catch (error) { next(error); }
  });
  router.get("/api/rules", requireAuthentication, async (_req, res, next) => {
    try { res.json({ rules: await getRules() }); }
    catch (error) { next(error); }
  });
  router.post("/api/admin/rules", requireAdmin, async (req, res, next) => {
    try {
      const { ruleName, ruleType, pattern, action = "BLOCK", enabled = true } = req.body || {};
      if (!ruleName?.trim() || ruleType !== "SQL_INJECTION" || !pattern?.trim() || pattern.length > 95 || /[\t\r\n]/.test(pattern) || action !== "BLOCK")
        return res.status(400).json({ error: "Rule requires a name, SQL_INJECTION type, a pattern up to 95 characters, and BLOCK action." });
      const rule = await saveRule({ ruleName: ruleName.trim(), ruleType, pattern: pattern.trim(), action, enabled: Boolean(enabled) });
      const ruleCount = await engine.syncRules(await getRules());
      io.emit("rules:changed", { ruleCount });
      res.status(201).json({ rule });
    } catch (error) { next(error); }
  });
  router.patch("/api/admin/rules/:id", requireAdmin, async (req, res, next) => {
    try {
      const existing = (await getRules()).find((rule) => rule.id === req.params.id);
      if (!existing) return res.status(404).json({ error: "Rule not found" });
      const changes = req.body || {};
      if ((changes.ruleName !== undefined && !String(changes.ruleName).trim()) ||
          (changes.ruleType !== undefined && changes.ruleType !== "SQL_INJECTION") ||
          (changes.action !== undefined && changes.action !== "BLOCK") ||
          (changes.pattern !== undefined && (!String(changes.pattern).trim() || String(changes.pattern).length > 95 || /[\t\r\n]/.test(changes.pattern))))
        return res.status(400).json({ error: "Unsupported or invalid rule update." });
      const rule = await saveRule({ ...existing, ...changes, id: existing.id });
      const ruleCount = await engine.syncRules(await getRules());
      io.emit("rules:changed", { ruleCount });
      res.json({ rule });
    } catch (error) { next(error); }
  });
  router.delete("/api/admin/rules/:id", requireAdmin, async (req, res, next) => {
    try {
      await removeRule(req.params.id);
      const ruleCount = await engine.syncRules(await getRules());
      io.emit("rules:changed", { ruleCount });
      res.status(204).end();
    } catch (error) { next(error); }
  });
  router.get("/api/admin/blocked-sources", requireAdmin, async (_req, res, next) => {
    try { res.json({ sources: await getBlockedSources() }); }
    catch (error) { next(error); }
  });
  router.post("/api/admin/blocked-sources", requireAdmin, async (req, res, next) => {
    try {
      const { source, reason = "Manually blocked", minutes = 60 } = req.body || {};
      if (!source?.trim()) return res.status(400).json({ error: "Source is required" });
      const expiresAt = new Date(Date.now() + Math.min(Math.max(Number(minutes) || 60, 1), 1440) * 60000);
      res.status(201).json({ source: await addBlockedSource(source.trim(), reason, expiresAt) });
    } catch (error) { next(error); }
  });
  router.get("/api/dsa", requireAuthentication, (_req, res) => {
    res.json({
      engine: engine.metrics(),
      structures: [
        { name: "Queue", role: "FIFO incoming request processing" },
        { name: "Stack", role: "Recent security events" },
        { name: "List", role: "Configured API route allow-list" },
        { name: "Linked List", role: "Bounded in-process request history" },
        { name: "Tree", role: "Threat category decision lookup" },
      ],
    });
  });
  router.all(/^\/api\/.*/, validateApiRequest, gateway, (req, res) => {
    res.json({ success: true, message: "Protected API processed the request", requestId: req.gatewayRequestId, method: req.method, received: req.body ?? null });
  });
  router.use((_req, res) => res.status(404).json({ error: "Route not found" }));
  return router;
}