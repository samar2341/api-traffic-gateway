const requestHistory = [];

const state = {
  totalRequests: 0,
  allowedRequests: 0,
  blockedRequests: 0,
  activeUsers: new Set(),
};

function normalizeUserId(userId) {
  const value = String(userId ?? "").trim();

  if (!/^\d+$/.test(value)) {
    throw new Error("Please enter a valid User ID.");
  }

  return value;
}

function normalizeEndpoint(endpoint) {
  const value = String(endpoint ?? "").trim();
  const validEndpoints = ["/products", "/login", "/profile", "/orders"];

  if (!validEndpoints.includes(value)) {
    throw new Error("Please select an endpoint.");
  }

  return value;
}

function getHttpMethod(endpoint) {
  switch (endpoint) {
    case "/login":
    case "/orders":
      return "POST";
    default:
      return "GET";
  }
}

function determineDecision(userId, endpoint, requestCount) {
  const requestNumber = state.totalRequests + 1;
  const pattern = requestNumber % 4;

  if ((endpoint === "/login" && pattern === 0) || (endpoint === "/orders" && pattern === 1)) {
    return "BLOCKED";
  }

  if (requestCount >= 2 && endpoint === "/products" && Number(userId) % 2 === 1) {
    return "BLOCKED";
  }

  return "ALLOWED";
}

function processRequest(payload = {}) {
  const userId = normalizeUserId(payload.userId);
  const endpoint = normalizeEndpoint(payload.endpoint);
  const requestCount = requestHistory.filter((item) => item.userId === userId).length;
  const decision = determineDecision(userId, endpoint, requestCount);
  const timestamp = new Date().toLocaleTimeString();

  state.totalRequests += 1;
  state.activeUsers.add(userId);

  if (decision === "ALLOWED") {
    state.allowedRequests += 1;
  } else {
    state.blockedRequests += 1;
  }

  const entry = {
    userId,
    endpoint,
    method: getHttpMethod(endpoint),
    decision,
    timestamp,
  };

  requestHistory.push(entry);

  return {
    decision,
    userId,
    endpoint,
    timestamp,
    method: entry.method,
  };
}

function getStats() {
  return {
    totalRequests: state.totalRequests,
    allowedRequests: state.allowedRequests,
    blockedRequests: state.blockedRequests,
    activeUsers: state.activeUsers.size,
  };
}

function getHistory() {
  return [...requestHistory].slice(-20);
}

module.exports = {
  processRequest,
  getStats,
  getHistory,
};
