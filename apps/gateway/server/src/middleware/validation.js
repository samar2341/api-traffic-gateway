const allowedMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

export function validateApiRequest(req, res, next) {
  if (!allowedMethods.has(req.method))
    return res.status(400).json({ error: "Unsupported HTTP method", code: "INVALID_REQUEST" });
  if (typeof req.path !== "string" || !req.path.startsWith("/api/"))
    return res.status(400).json({ error: "Invalid API endpoint", code: "INVALID_REQUEST" });
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    if (!req.is("application/json"))
      return res.status(400).json({ error: "Content-Type must be application/json", code: "INVALID_REQUEST" });
    if (req.body === null || typeof req.body !== "object" || Array.isArray(req.body))
      return res.status(400).json({ error: "Request body must be a JSON object", code: "INVALID_REQUEST" });
  }
  next();
}