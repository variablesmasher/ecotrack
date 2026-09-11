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
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      // Guard against routes misconfigured without requireAuth preceding requireRole
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "You don't have permission to perform this action" });
    }
    next();
  };
};

