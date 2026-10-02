import jwt from "jsonwebtoken";

export function optionalAuthentication(req, _res, next) {
  const token = req.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  req.identity = { authenticated: false, admin: false, subject: null };
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.identity = {
        authenticated: true,
        admin: payload.role === "admin",
        subject: String(payload.sub || "unknown"),
      };
    } catch {
      req.identity.invalidToken = true;
    }
  }
  next();
}

export function requireAuthentication(req, res, next) {
  if (!req.identity?.authenticated)
    return res.status(401).json({ error: "Authentication required", code: "UNAUTHORIZED" });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.identity?.authenticated)
    return res.status(401).json({ error: "Authentication required", code: "UNAUTHORIZED" });
  if (!req.identity.admin)
    return res.status(403).json({ error: "Administrator permission required", code: "FORBIDDEN" });
  next();
}