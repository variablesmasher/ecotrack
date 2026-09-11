// Import the Express Router class to define modular, mountable route handlers
import { Router } from "express";

// Import all authentication controller functions from authController.js
import {
  register,        // Handles organization signup and admin account creation
  login,           // Handles email/password authentication
  googleLogin,     // Handles Google OAuth 2.0 credential verification and auto-provisioning
  getMe,           // Handles session restoration via validated Bearer JWT
  forgotPassword,  // Handles OTP generation and email dispatch
  verifyOtp,       // Handles 6-digit OTP verification and reset token issuance
  resetPassword,   // Handles verified password update with complexity checks
} from "../controllers/authController.js";

// Import the requireAuth middleware to protect routes requiring an active session
import { requireAuth } from "../middleware/auth.js";

/**
 * ============================================================================
 * MEMBER 1: AUTHENTICATION & SECURITY
 * Authentication Router (server/routes/authRoutes.ts)
 * ============================================================================
 * Defines all public and protected HTTP routes mounted under /api/auth in Express.
 */

// Initialize a new Express Router instance
const router = Router();

// Route: POST /api/auth/register
// Registers a new company entity and its initial administrator user.
// Public endpoint - requires no prior authentication.
router.post("/register", register);

// Route: POST /api/auth/login
// Validates email and password, issuing a 7-day cryptographic JSON Web Token (JWT).
// Public endpoint - requires no prior authentication.
router.post("/login", login);

// Route: POST /api/auth/google
// Accepts a Google ID token (or dev mock user), verifies with Google, and returns a session JWT.
// Public endpoint - handles both login and new user onboarding via Google OAuth.
router.post("/google", googleLogin);

// Route: GET /api/auth/me
// Re-hydrates user session and organization metadata on hard page refresh.
// Protected endpoint - uses requireAuth middleware to verify the Authorization: Bearer <token> header.
router.get("/me", requireAuth, getMe);

// Route: POST /api/auth/forgot-password
// Initiates password recovery by sending a 6-digit verification code to the user's email.
// Public endpoint - incorporates enumeration defense (always returns a generic success message).
router.post("/forgot-password", forgotPassword);

// Route: POST /api/auth/verify-otp
// Validates the 6-digit OTP entered by the user, enforces rate limiting, and issues a 15-min resetToken.
// Public endpoint - protected against brute force attacks (locks out after 5 failures).
router.post("/verify-otp", verifyOtp);

// Route: POST /api/auth/reset-password
// Sets a new password using the verified resetToken and validates strong password rules.
// Public endpoint - requires valid unexpired single-purpose resetToken.
router.post("/reset-password", resetPassword);

// Export the configured router for mounting in server.ts under /api/auth
export default router;
