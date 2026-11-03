import { Router } from "express";
import { z } from "zod";
import { AuthError, loginUser, registerUser } from "../services/auth.service.js";
import { authenticate, type AuthContext } from "../middleware/auth.middleware.js";
import { User } from "../models/User.js";

const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});

function sendError(error: unknown, res: Parameters<Parameters<typeof authRouter.post>[1]>[1], next: (error?: unknown) => void) {
  if (error instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid authentication input", details: error.issues },
    });
    return;
  }
  if (error instanceof AuthError) {
    res.status(error.statusCode).json({
      success: false,
      error: { code: "AUTH_ERROR", message: error.message },
    });
    return;
  }
  next(error);
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const result = await registerUser(input);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    sendError(error, res, next);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await loginUser(input);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    sendError(error, res, next);
  }
});

authRouter.get("/me", authenticate, async (_req, res, next) => {
  try {
    const auth = res.locals.auth as AuthContext;
    const user = await User.findById(auth.userId).select("name email role isActive");
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Account is unavailable" } });
      return;
    }
    res.status(200).json({
      success: true,
      data: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
});

export { authRouter };
