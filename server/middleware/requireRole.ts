// Import standard Express middleware types: Request, Response, NextFunction
import { Request, Response, NextFunction } from "express";

/**
 * ============================================================================
 * MEMBER 1: AUTHENTICATION & SECURITY
 * Role-Based Access Control (RBAC) Middleware (server/middleware/requireRole.ts)
 * ============================================================================
 * Purpose:
 * Enforces role authorization by verifying that `req.user.role` (populated by
 * `requireAuth`) matches one of the `allowedRoles` configured for the route.
 * 
 * Supported roles in EcoTrack:
 * - 'admin': Full control over company, users, logs, departments, analytics.
 * - 'employee': Can create and view emission logs.
 * - 'executive': View-only access to corporate analytics and reports.
 */

// Higher-order middleware factory function accepting an array of authorized roles
export const requireRole = (allowedRoles: string[]) => {
  // Returns the actual Express middleware handler function
  return (req: Request, res: Response, next: NextFunction) => {
    // 1. Guard check: verify that req.user was already populated by requireAuth
    if (!req.user) {
      // If req.user is undefined, the route was accessed without preceding requireAuth
      return res.status(401).json({ message: "Not authenticated" });
    }

    // 2. Check if the authenticated user's assigned role is within allowedRoles
    if (!allowedRoles.includes(req.user.role)) {
      // Role is not authorized: reject with 403 Forbidden status
      return res.status(403).json({ message: "You don't have permission to perform this action" });
    }

    // 3. User has the required role: call next() to proceed to the controller
    next();
  };
};
