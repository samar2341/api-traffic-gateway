import { randomUUID } from "node:crypto";

const memory = {
  requests: [],
  events: [],
  counters: { total: 0, allowed: 0, blocked: 0, limited: 0, invalid: 0 },
  minuteBuckets: new Map(),
  rules: [
    { id: "sql-or", ruleName: "SQL tautology", ruleType: "SQL_INJECTION", pattern: "' OR '", action: "BLOCK", enabled: true },
    { id: "sql-equality", ruleName: "Boolean equality", ruleType: "SQL_INJECTION", pattern: " OR 1=1", action: "BLOCK", enabled: true },
    { id: "sql-union", ruleName: "UNION SELECT", ruleType: "SQL_INJECTION", pattern: "UNION SELECT", action: "BLOCK", enabled: true },
    { id: "sql-drop", ruleName: "DROP TABLE", ruleType: "SQL_INJECTION", pattern: "DROP TABLE", action: "BLOCK", enabled: true },
    { id: "sql-insert", ruleName: "INSERT INTO", ruleType: "SQL_INJECTION", pattern: "INSERT INTO", action: "BLOCK", enabled: true },
    { id: "sql-comment", ruleName: "SQL comment", ruleType: "SQL_INJECTION", pattern: "--", action: "BLOCK", enabled: true },
    { id: "sql-sleep", ruleName: "Delay function", ruleType: "SQL_INJECTION", pattern: "SLEEP(", action: "BLOCK", enabled: true },
  ],
  blockedSources: [],
};

let prisma = null;
let databaseMode = false;

export async function initializeStore() {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL is not set; using in-memory development storage.");
    return;
  }
  const { PrismaClient } = await import("@prisma/client");
  prisma = new PrismaClient();
  await prisma.$connect();
  databaseMode = true;
  console.log("PostgreSQL persistence connected.");
}

export function getStoreMode() {
  return databaseMode ? "postgresql" : "memory";
}

export async function saveRequest(request) {
  if (databaseMode) {
    await prisma.gatewayRequest.create({ data: request });
    return;
  }
  memory.counters.total++;
  if (request.decision === "ALLOW") memory.counters.allowed++;
  else if (request.decision === "RATE_LIMIT") memory.counters.limited++;
  else memory.counters.blocked++;
  if (request.eventType === "INVALID_REQUEST") memory.counters.invalid++;
  const minuteKey = Math.floor(new Date(request.timestamp).getTime() / 60000);
  memory.minuteBuckets.set(minuteKey, (memory.minuteBuckets.get(minuteKey) || 0) + 1);
  for (const key of memory.minuteBuckets.keys())
    if (key < minuteKey - 59) memory.minuteBuckets.delete(key);
  memory.requests.unshift(request);
  memory.requests.length = Math.min(memory.requests.length, 1000);
}

export async function saveEvent(event) {
  if (databaseMode) {
    await prisma.securityEvent.create({ data: event });
    return;
  }
  memory.events.unshift({ ...event, id: randomUUID() });
  memory.events.length = Math.min(memory.events.length, 1000);
}

export async function getRequests(limit = 100) {
  if (databaseMode)
    return prisma.gatewayRequest.findMany({ orderBy: { timestamp: "desc" }, take: limit });
  return memory.requests.slice(0, limit);
}

export async function getEvents(filters = {}) {
  if (databaseMode) {
    const where = {};
    for (const key of ["eventType", "action", "severity", "source"])
      if (filters[key]) where[key] = filters[key];
    return prisma.securityEvent.findMany({ where, orderBy: { timestamp: "desc" }, take: 200 });
  }
  return memory.events.filter((event) => Object.entries(filters).every(([key, value]) => !value || event[key] === value)).slice(0, 200);
}

export async function getRules() {
  if (databaseMode) return prisma.rule.findMany({ orderBy: { createdAt: "asc" } });
  return [...memory.rules];
}

export async function saveRule(rule) {
  if (databaseMode) {
    const { id, ...data } = rule;
    return id
      ? prisma.rule.upsert({ where: { id }, create: { id, ...data }, update: data })
      : prisma.rule.create({ data });
  }
  const index = memory.rules.findIndex((item) => item.id === rule.id);
  if (index >= 0) memory.rules[index] = { ...memory.rules[index], ...rule };
  else memory.rules.push({ ...rule, id: rule.id || randomUUID() });
  return memory.rules.find((item) => item.id === rule.id) || memory.rules.at(-1);
}

export async function removeRule(id) {
  if (databaseMode) return prisma.rule.delete({ where: { id } });
  const length = memory.rules.length;
  memory.rules = memory.rules.filter((rule) => rule.id !== id);
  return memory.rules.length !== length;
}

export async function getBlockedSources() {
  if (databaseMode) return prisma.blockedSource.findMany({ where: { active: true } });
  return [...memory.blockedSources];
}

export async function addBlockedSource(source, reason, expiresAt = null) {
  const blocked = { source, reason, createdAt: new Date(), expiresAt, active: true };
  if (databaseMode) return prisma.blockedSource.create({ data: blocked });
  memory.blockedSources = memory.blockedSources.filter((item) => item.source !== source);
  memory.blockedSources.push({ ...blocked, id: randomUUID() });
  return memory.blockedSources.at(-1);
}

export async function isSourceBlocked(source) {
  if (databaseMode) {
    const match = await prisma.blockedSource.findFirst({ where: { source, active: true } });
    return Boolean(match && (!match.expiresAt || match.expiresAt > new Date()));
  }
  const match = memory.blockedSources.find((item) => item.source === source && item.active);
  return Boolean(match && (!match.expiresAt || match.expiresAt > new Date()));
}

export async function getMetrics() {
  if (databaseMode) {
    const [total, allowed, blocked, limited, invalid, recent] = await Promise.all([
      prisma.gatewayRequest.count(),
      prisma.gatewayRequest.count({ where: { decision: "ALLOW" } }),
      prisma.gatewayRequest.count({ where: { decision: "BLOCK" } }),
      prisma.gatewayRequest.count({ where: { decision: "RATE_LIMIT" } }),
      prisma.gatewayRequest.count({ where: { eventType: "INVALID_REQUEST" } }),
      prisma.gatewayRequest.findMany({ orderBy: { timestamp: "desc" }, take: 200 }),
    ]);
    return buildMetrics(recent, { total, allowed, blocked, limited, invalid });
  }
  return buildMetrics(memory.requests, memory.counters, Math.max(0, ...memory.minuteBuckets.values()));
}

function buildMetrics(requests, counts, peakRequestsPerMinute) {
  const now = Date.now();
  const recentMinute = requests.filter((request) => now - new Date(request.timestamp).getTime() < 60000);
  const recentSecond = requests.filter((request) => now - new Date(request.timestamp).getTime() < 1000);
  const total = counts?.total ?? requests.length;
  const allowed = counts?.allowed ?? requests.filter((item) => item.decision === "ALLOW").length;
  const blocked = counts?.blocked ?? requests.filter((item) => item.decision === "BLOCK").length;
  const limited = counts?.limited ?? requests.filter((item) => item.decision === "RATE_LIMIT").length;
  const invalid = counts?.invalid ?? requests.filter((item) => item.eventType === "INVALID_REQUEST").length;
  return {
    totalRequests: total,
    allowedRequests: allowed,
    blockedRequests: blocked,
    rateLimitedRequests: limited,
    invalidRequests: invalid,
    requestsPerSecond: recentSecond.length,
    requestsPerMinute: recentMinute.length,
    peakRequestsPerMinute: peakRequestsPerMinute ?? Math.max(recentMinute.length, 0),
    averageLatencyMs: requests.length ? Number((requests.reduce((sum, item) => sum + item.latencyMs, 0) / requests.length).toFixed(2)) : 0,
    queueLength: 0,
    activeRequests: 0,
    sqlInjectionEvents: requests.filter((item) => item.eventType === "SQL_INJECTION").length,
    trafficFloodEvents: requests.filter((item) => item.eventType === "FLOOD").length,
    unauthorizedEvents: requests.filter((item) => item.eventType === "UNAUTHORIZED").length,
  };
}

export async function disconnectStore() {
  if (prisma) await prisma.$disconnect();
}