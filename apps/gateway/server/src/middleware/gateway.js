import { randomUUID } from "node:crypto";
import { addBlockedSource, isSourceBlocked, saveEvent, saveRequest } from "../services/store.js";

const severityFor = (eventType) => ({
  SQL_INJECTION: "high",
  FLOOD: "high",
  INVALID_REQUEST: "low",
  UNAUTHORIZED: "medium",
}[eventType] || "low");

export function createGatewayMiddleware({ engine, io }) {
  return async function gateway(req, res, next) {
    const startedAt = performance.now();
    const simulatedSource = req.get("x-gateway-simulated-source")?.trim();
    const sourceKey = simulatedSource || req.ip || req.socket.remoteAddress || "unknown";
    const source = simulatedSource ? `${sourceKey} (simulated)` : sourceKey;
    const requestId = randomUUID();
    try {
      const blocked = await isSourceBlocked(sourceKey);
      const input = JSON.stringify({ originalUrl: req.originalUrl, query: req.query, body: req.body ?? null });
      const decision = await engine.evaluate({
            id: requestId,
            source: sourceKey,
            method: req.method,
            endpoint: req.path,
            authenticated: Boolean(req.identity?.authenticated),
            admin: Boolean(req.identity?.admin),
            blocked,
            input,
          });

      const latencyMs = Number((performance.now() - startedAt).toFixed(2));
      const record = {
        id: requestId,
        timestamp: new Date(),
        source,
        method: req.method,
        endpoint: req.originalUrl,
        decision: decision.decision,
        status: decision.decision === "ALLOW" ? "processed" : "rejected",
        responseCode: decision.statusCode,
        latencyMs,
        eventType: decision.eventType === "NONE" ? null : decision.eventType,
        reason: decision.reason,
      };
      await saveRequest(record);
      const publicRecord = { ...record, timestamp: record.timestamp.toISOString(), engine: decision.metrics };
      io.emit("request:processed", publicRecord);
      io.emit("gateway:stats", { engine: decision.metrics });

      if (decision.eventType && decision.eventType !== "NONE") {
        const event = {
          timestamp: record.timestamp,
          eventType: decision.eventType,
          source,
          endpoint: req.originalUrl,
          action: decision.decision,
          severity: severityFor(decision.eventType),
          details: decision.reason,
        };
        await saveEvent(event);
        io.emit("security:event", { ...event, timestamp: event.timestamp.toISOString() });
        if (decision.eventType === "FLOOD")
          await addBlockedSource(sourceKey, decision.reason, new Date(Date.now() + 60000));
      }

      req.gatewayDecision = decision;
      req.gatewayRequestId = requestId;
      if (decision.decision !== "ALLOW")
        return res.status(decision.statusCode).json({ success: false, decision: decision.decision, code: decision.eventType, reason: decision.reason, requestId });
      next();
    } catch (error) {
      next(error);
    }
  };
}