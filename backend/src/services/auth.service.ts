import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { User } from "../models/User.js";
import { env } from "../config/env.js";

const scrypt = promisify(scryptCallback);
const TOKEN_TTL_SECONDS = 60 * 60;

export type AuthRole = "user" | "admin";
export interface AuthPayload {
  userId: string;
  email: string;
  role: AuthRole;
  iat: number;
  exp: number;
}

export class AuthError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = "AuthError";
  }
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function signToken(payload: Omit<AuthPayload, "iat" | "exp">): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + TOKEN_TTL_SECONDS })).toString("base64url");
  const unsigned = `${header}.${body}`;
  const signature = createHmac("sha256", env.JWT_SECRET).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

export function verifyToken(token: string): AuthPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new AuthError("Invalid or expired authentication token", 401);

  const [header, body, signature] = parts;
  if (!header || !body || !signature) throw new AuthError("Invalid or expired authentication token", 401);

  const unsigned = `${header}.${body}`;
  const expected = createHmac("sha256", env.JWT_SECRET).update(unsigned).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(signature, "base64url");
  } catch {
    throw new AuthError("Invalid or expired authentication token", 401);
  }
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw new AuthError("Invalid or expired authentication token", 401);
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AuthPayload;
    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      (payload.role !== "user" && payload.role !== "admin") ||
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      throw new Error("Invalid payload");
    }
    return payload;
  } catch {
    throw new AuthError("Invalid or expired authentication token", 401);
  }
}

export async function registerUser(input: { name: string; email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const existing = await User.exists({ email });
  if (existing) throw new AuthError("An account with this email already exists", 409);

  const user = await User.create({
    name: input.name.trim(),
    email,
    passwordHash: await hashPassword(input.password),
    role: "user",
  });

  const token = signToken({ userId: user.id, email: user.email, role: "user" });
  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await User.findOne({ email: input.email.trim().toLowerCase() }).select("+passwordHash");
  if (!user || !user.isActive || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AuthError("Invalid email or password", 401);
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}
