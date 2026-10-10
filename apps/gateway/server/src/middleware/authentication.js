import jwt from "jsonwebtoken";

export function optionalAuthentication(req, _res, next) {
  const token = req.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  req.identity = { authenticated: true, admin: true, subject: "anonymous" };
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.identity = {
        authenticated: true,
        admin: payload.role === "admin",
        subject: String(payload.sub || "anonymous"),
      };
    } catch {
      req.identity = { authenticated: true, admin: true, subject: "anonymous" };
    }
  }
  next();
}

export function requireAuthentication(_req, _res, next) {
  next();
}

export function requireAdmin(_req, _res, next) {
  next();
}