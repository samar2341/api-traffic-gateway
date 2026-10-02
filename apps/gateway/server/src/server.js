import "dotenv/config";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import { Server as SocketServer } from "socket.io";
import { optionalAuthentication } from "./middleware/authentication.js";
import { createGatewayRoutes } from "./routes/gatewayRoutes.js";
import { NativeEngine } from "./services/nativeEngine.js";
import { disconnectStore, getRules, initializeStore, saveEvent, saveRequest } from "./services/store.js";

const app = express();
const server = createServer(app);
const origins = (process.env.CLIENT_ORIGINS || "http://localhost:5173,http://localhost:5174").split(",").map((origin) => origin.trim());
const io = new SocketServer(server, { cors: { origin: origins, methods: ["GET", "POST", "PATCH", "DELETE"] } });
const engine = new NativeEngine();
const port = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "true");
app.use(helmet());
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: "8kb", strict: true }));
app.use(optionalAuthentication);
app.use(createGatewayRoutes({ engine, io }));
app.use((error, _req, res, _next) => {
  const status = Number(error.status) || 500;
  console.error(JSON.stringify({ level: "error", message: error.message, status }));
  if (res.headersSent) return;
  if (error instanceof SyntaxError && status === 400) {
    const source = _req.ip || _req.socket.remoteAddress || "unknown";
    const requestId = randomUUID();
    engine.evaluate({ id: requestId, source, method: _req.method, endpoint: _req.path, authenticated: false, admin: false, input: "INVALID_JSON" })
      .then(async (decision) => {
        const timestamp = new Date();
        await saveRequest({ id: requestId, timestamp, source, method: _req.method, endpoint: _req.originalUrl, decision: decision.decision, status: "rejected", responseCode: decision.statusCode, latencyMs: 0, eventType: decision.eventType, reason: decision.reason });
        await saveEvent({ timestamp, eventType: decision.eventType, source, endpoint: _req.originalUrl, action: decision.decision, severity: "low", details: decision.reason });
        io.emit("security:event", { eventType: decision.eventType, source, endpoint: _req.originalUrl, action: decision.decision, severity: "low", details: decision.reason, timestamp: timestamp.toISOString() });
        res.status(decision.statusCode).json({ success: false, decision: decision.decision, code: decision.eventType, reason: decision.reason, requestId });
      })
      .catch((cause) => res.status(cause.status || 503).json({ error: cause.message }));
    return;
  }
  res.status(status).json({ error: status >= 500 ? "Gateway service unavailable" : error.message, code: error.code || "GATEWAY_ERROR" });
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    socket.data.identity = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  socket.emit("gateway:connected", { connected: true, timestamp: new Date().toISOString() });
});

async function start() {
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET is required in production.");
    process.env.JWT_SECRET = "development-only-secret-change-before-deployment";
    console.warn("JWT_SECRET is unset; using a development-only signing key.");
  }
  await initializeStore();
  const binary = engine.start();
  await engine.syncRules(await getRules());
  server.listen(port, "0.0.0.0", () => {
    console.log(`API Traffic Gateway listening on http://localhost:${port}`);
    console.log(`Native C engine: ${binary}`);
  });
}

async function shutdown() {
  engine.stop();
  io.close();
  server.close();
  await disconnectStore();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
start().catch((error) => {
  console.error(`Gateway startup failed: ${error.message}`);
  process.exitCode = 1;
});