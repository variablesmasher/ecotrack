// Import standard Express middleware types: Request, Response, NextFunction
import { Request, Response, NextFunction } from "express";
// Import jsonwebtoken for verifying HMAC SHA-256 token signatures
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

// TypeScript interface defining the exact payload encoded inside each EcoTrack JWT
export interface AuthPayload {
  id: string;                                     // MongoDB User ObjectId as a string
  role: "admin" | "employee" | "executive";        // User's authorization role for RBAC
  companyId: string;                              // Associated Company ObjectId for multi-tenancy
}

// Extend Express's global Request interface so req.user is recognized by TypeScript
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload; // Optional property attached to request when authenticated
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
  // 1. Read the HTTP 'Authorization' header from incoming request
  const authHeader = req.headers.authorization;

  // 2. Validate header existence and ensure it follows the "Bearer <token>" standard
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Missing or improperly formatted header: reject with 401 Unauthorized
    return res.status(401).json({ message: "No token provided" });
  }

  // 3. Extract the raw token string after the "Bearer " prefix
  const token = authHeader.split(" ")[1];

  try {
    // 4. Retrieve secret key from server environment
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // Security safeguard: fail loudly rather than silently trusting unverifiable tokens
      console.error("JWT_SECRET is not set in environment variables");
      // Return 500 Internal Server Error indicating misconfigured server
      return res.status(500).json({ message: "Server misconfiguration" });
    }

    // 5. Cryptographically verify signature and expiration using the secret key
    const decoded = jwt.verify(token, secret) as AuthPayload;

    // 6. Attach the decoded user identity payload to the Express request object
    req.user = decoded;

    // 7. Call next() to allow execution to proceed to the route handler or next middleware
    next();
  } catch (error) {
    // Token is forged, tampered with, or expired: return 401 Unauthorized
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
