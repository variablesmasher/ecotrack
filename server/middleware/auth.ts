import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

/**
 * ============================================================================
 * MEMBER 1: AUTHENTICATION & SECURITY
 * JWT Authentication Middleware (server/middleware/auth.ts)
 * ============================================================================
 * Purpose:
 * Validates incoming HTTP requests containing a Bearer JWT in the Authorization
 * header. When valid, decodes user credentials (id, role, companyId) and attaches
 * them to `req.user` for downstream controllers and RBAC guards.
 */

export interface AuthPayload {
  id: string;
  role: "admin" | "employee" | "executive";
  companyId: string;
}

// Extend Express's Request type so req.user is typed everywhere it's used.
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * requireAuth middleware:
 * 1. Checks for existence of "Authorization: Bearer <token>" header
 * 2. Verifies token integrity and expiration using JWT_SECRET
 * 3. Injects decoded payload into req.user
 * 4. Rejects requests with 401 Unauthorized if missing, altered, or expired
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // Fail loudly rather than silently trusting unverifiable tokens.
      console.error("JWT_SECRET is not set in environment variables");
      return res.status(500).json({ message: "Server misconfiguration" });
    }

    // Verify token cryptographic signature and expiration
    const decoded = jwt.verify(token, secret) as AuthPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

