import type { RequestHandler } from "express";
import { AuthError, verifyToken } from "../services/auth.service.js";
import { User } from "../models/User.js";

export interface AuthContext {
  userId: string;
  email: string;
  role: "user" | "admin";
}

export const authenticate: RequestHandler = async (req, res, next) => {
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
    const user = await User.findById(payload.userId).select("email role isActive");
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Account is unavailable" },
      });
      return;
    }

    res.locals.auth = {
      userId: user.id,
      email: user.email,
      role: user.role,
    } satisfies AuthContext;
    next();
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or expired authentication token",
        },
      });
      return;
    }
    next(error);
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
