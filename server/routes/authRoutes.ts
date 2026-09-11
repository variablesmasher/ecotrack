import { Router } from "express";
import {
  register,
  login,
  googleLogin,
  getMe,
  forgotPassword,
  verifyOtp,
  resetPassword,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

/**
 * ============================================================================
 * MEMBER 1: AUTHENTICATION & SECURITY
 * Authentication Router (server/routes/authRoutes.ts)
 * ============================================================================
 * Endpoints:
 * - POST /api/auth/register        : User & Company onboarding with strong password
 * - POST /api/auth/login           : Standard email/password authentication
 * - POST /api/auth/google          : Google OAuth 2.0 token sign-in & provisioning
 * - GET  /api/auth/me              : Session validation & recovery (requires Bearer JWT)
 * - POST /api/auth/forgot-password : Request 6-digit OTP sent to registered email
 * - POST /api/auth/verify-otp      : Verify 6-digit OTP and obtain temporary reset token
 * - POST /api/auth/reset-password  : Update password using reset token with strong rules
 */

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);
router.get("/me", requireAuth, getMe);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

export default router;

