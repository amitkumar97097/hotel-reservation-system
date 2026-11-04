import type { RequestHandler } from "express";
import { AuthError, verifyToken } from "../services/auth.service.js";

export interface AuthContext {
  userId: string;
  email: string;
  role: "user" | "admin";
}

export const authenticate: RequestHandler = (req, res, next) => {
  const authorization = req.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication is required" },
    });
    return;
  }

  try {
    const payload = verifyToken(authorization.slice(7).trim());
    res.locals.auth = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    } satisfies AuthContext;
    next();
  } catch (error) {
    const statusCode = error instanceof AuthError ? error.statusCode : 401;
    res.status(statusCode).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid or expired authentication token" },
    });
  }
};

export const requireAdmin: RequestHandler = (_req, res, next) => {
  const auth = res.locals.auth as AuthContext | undefined;
  if (auth?.role !== "admin") {
    res.status(403).json({
      success: false,
      error: { code: "FORBIDDEN", message: "Administrator access is required" },
    });
    return;
  }
  next();
};
