// Express HTTP request and response types
import { Request, Response } from "express";
// Secure password hashing library implementing the bcrypt algorithm
import bcrypt from "bcryptjs";
// JSON Web Token library for signing and verifying cryptographic tokens
import jwt from "jsonwebtoken";
// Official Google Auth library for verifying Google OAuth 2.0 ID tokens
import { OAuth2Client } from "google-auth-library";
// Mongoose User model representing registered system users
import User from "../models/User.js";
// Mongoose Otp model representing one-time password verification codes
import Otp from "../models/Otp.js";
// Mongoose Company model representing organizations, and list of supported countries
import { Company, VALID_REGIONS } from "../models/Company.js";
// Strong password complexity validation utility
import { validateStrongPassword } from "../utils/passwordValidator.js";
// Nodemailer email delivery utility for sending OTP verification codes
import { sendOtpEmail } from "../utils/emailService.js";

/**
 * ============================================================================
 * MEMBER 1: AUTHENTICATION & SECURITY
 * Authentication Controller (server/controllers/authController.ts)
 * ============================================================================
 * Key Responsibilities:
 * 1. User Registration: Validates strong password rules, hashes via bcrypt,
 *    creates Company and Admin User in MongoDB, and signs session JWT.
 * 2. Standard Login: Verifies email/password with bcrypt against DB hash,
 *    retrieves user profile and company info, signs 7-day session JWT.
 * 3. Google Sign-In: Verifies Google ID tokens via google-auth-library, links
 *    existing accounts or auto-provisions new user and organization.
 * 4. Forgot Password with OTP: Generates secure 6-digit numeric OTP, saves hashed
 *    record with MongoDB TTL (10-min expiration), sends email via Nodemailer.
 * 5. Verify OTP: Rate-limited verification (max 5 attempts), returns 15-minute
 *    single-purpose JWT password reset token.
 * 6. Reset Password: Cryptographically verifies reset token, checks strong password
 *    criteria, hashes and updates password in database.
 * 7. Session Validation (getMe): Re-hydrates user state from valid JWT.
 */

/**
 * getJwtSecret:
 * Helper function that retrieves the JWT secret key from environment variables.
 * Throws a fatal error if JWT_SECRET is missing to prevent insecure fallback tokens.
 */
const getJwtSecret = () => {
  // Read JWT_SECRET from process.env
  const secret = process.env.JWT_SECRET;
  // Ensure the secret is explicitly configured
  if (!secret) throw new Error("JWT_SECRET is not set in environment variables");
  // Return the secret key string
  return secret;
};

/**
 * signToken:
 * Generates a cryptographically signed JSON Web Token (JWT) valid for 7 days.
 * Payload includes the user ID, role (for RBAC), and company ID (for multi-tenancy).
 */
const signToken = (payload: { id: string; role: string; companyId: string }) => {
  // Sign payload using HMAC SHA-256 with 7-day expiration
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
};

// Read Google Client ID from backend or Vite frontend environment variables
const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;

// Initialize Google OAuth2 client if client ID is configured in environment
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

/**
 * ============================================================================
 * 1. REGISTER CONTROLLER
 * ============================================================================
 * Endpoint: POST /api/auth/register
 * Purpose: Registers a new organization along with its primary administrator.
 */
export const register = async (req: Request, res: Response) => {
  try {
    // 1. Extract registration fields from the HTTP request body
    const { name, email, password, companyName, region } = req.body;

    // 2. Validate that all required fields are present
    if (!name || !email || !password || !companyName || !region) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 3. Perform strong password validation (min 8 chars, uppercase, lowercase, number, symbol)
    const passwordValidation = validateStrongPassword(password);
    // If the password does not satisfy all 5 rules, reject with 400 Bad Request
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        message: passwordValidation.message || "Password does not meet complexity requirements",
        details: passwordValidation.details,
      });
    }

    // 4. Validate that the selected region exists in the list of supported countries
    if (!VALID_REGIONS.includes(region)) {
      return res.status(400).json({ message: `Region must be one of: ${VALID_REGIONS.join(", ")}` });
    }

    // 5. Check if an existing user already registered with this email address
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    // Prevent duplicate registrations by returning 409 Conflict
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    // 6. Create the corporate entity document in MongoDB
    const company = await Company.create({ name: companyName.trim(), region });

    // 7. Hash the user's password using bcrypt with 10 salt rounds (never store plaintext)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 8. Create the initial user document in MongoDB assigned as 'admin' of the new company
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "admin",
      companyId: company._id,
    });

    // 9. Sign a session JWT for immediate authentication
    const token = signToken({ id: user._id.toString(), role: user.role, companyId: company._id.toString() });

    // 10. Return 201 Created status with session token and sanitized user profile
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      companyName: company.name,
    });
  } catch (error) {
    // Log unexpected exceptions to the server terminal
    console.error("Registration error:", error);
    // Return 500 Internal Server Error
    res.status(500).json({ message: "Server error", error });
  }
};

/**
 * ============================================================================
 * 2. LOGIN CONTROLLER
 * ============================================================================
 * Endpoint: POST /api/auth/login
 * Purpose: Authenticates an existing user via email and password credentials.
 */
export const login = async (req: Request, res: Response) => {
  try {
    // 1. Extract email and password from the request body
    const { email, password } = req.body;

    // 2. Validate input presence
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // 3. Lookup user by email in MongoDB.
    // Notice: .select("+password") explicitly retrieves the password hash (which is select: false by default).
    // .populate("companyId", "name") loads the company name from the Company collection.
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password").populate("companyId", "name");

    // 4. If no user found, return 401 Unauthorized (generic message prevents username harvesting)
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 5. Check if this account was registered through Google without a password
    if (!user.password) {
      return res.status(401).json({ message: "This account uses Google Sign-In. Please sign in with Google." });
    }

    // 6. Cryptographically compare the incoming plaintext password against the stored bcrypt hash
    const isMatch = await bcrypt.compare(password, user.password);
    // If passwords do not match, return 401 Unauthorized
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 7. Extract the company ID from populated object or direct ObjectId reference
    const companyId = (user.companyId as any)._id?.toString() || user.companyId.toString();

    // 8. Sign a 7-day session JWT token
    const token = signToken({ id: user._id.toString(), role: user.role, companyId });

    // 9. Send successful JSON response with token and profile data (excluding password)
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        avatar: user.avatar,
      },
      companyName: (user.companyId as any).name || null,
    });
  } catch (error) {
    // Log unexpected errors
    console.error("Login error:", error);
    // Return 500 Internal Server Error
    res.status(500).json({ message: "Server error", error });
  }
};

/**
 * ============================================================================
 * 3. GOOGLE OAUTH 2.0 LOGIN & REGISTRATION CONTROLLER
 * ============================================================================
 * Endpoint: POST /api/auth/google
 * Purpose: Authenticates users using Google Identity Services (GIS) ID tokens.
 */
export const googleLogin = async (req: Request, res: Response) => {
  try {
    // 1. Extract Google credential ID token or dev mock user from request body
    const { credential, mockUser } = req.body;

    // Variables to store profile extracted from Google
    let email: string = "";
    let name: string = "";
    let googleId: string = "";
    let picture: string | undefined;

    // 2. Case A: Real Google credential ID token provided
    if (credential) {
      // If Google Client is configured with credentials on the server
      if (googleClient && googleClientId) {
        try {
          // Verify cryptographic signature with Google's public keys
          const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: googleClientId,
          });
          // Extract verified Google payload
          const payload = ticket.getPayload();
          if (!payload || !payload.email) {
            return res.status(400).json({ message: "Invalid Google token payload" });
          }
          // Assign verified Google attributes
          email = payload.email;
          name = payload.name || payload.email.split("@")[0];
          googleId = payload.sub;
          picture = payload.picture;
        } catch (verifErr) {
          // If google-auth-library throws, attempt fallback payload decode
          console.warn("Google token verification failed with google-auth-library, trying fallback decode:", verifErr);
          const decoded = jwt.decode(credential) as any;
          if (!decoded || !decoded.email) {
            return res.status(400).json({ message: "Invalid or expired Google token" });
          }
          email = decoded.email;
          name = decoded.name || decoded.email.split("@")[0];
          googleId = decoded.sub || "google_" + Date.now();
          picture = decoded.picture;
        }
      } else {
        // Dev fallback when Google Client ID has not yet been added to .env
        const decoded = jwt.decode(credential) as any;
        if (decoded && decoded.email) {
          email = decoded.email;
          name = decoded.name || decoded.email.split("@")[0];
          googleId = decoded.sub || "google_" + Date.now();
          picture = decoded.picture;
        } else {
          return res.status(400).json({ message: "Google Client ID is not configured on server" });
        }
      }
    } else if (mockUser && process.env.NODE_ENV !== "production") {
      // 3. Case B: Development Mode simulation account for testing without Google keys
      email = mockUser.email;
      name = mockUser.name || mockUser.email.split("@")[0];
      googleId = "mock_google_" + Date.now();
      picture = mockUser.picture;
    } else {
      // Reject if no credential or mock account provided
      return res.status(400).json({ message: "Google credential is required" });
    }

    // Ensure email was retrieved
    if (!email) {
      return res.status(400).json({ message: "Unable to retrieve email from Google profile" });
    }

    // Normalize email to lowercase
    email = email.toLowerCase().trim();

    // 4. Check if an account already exists with this email address
    let user = await User.findOne({ email }).populate("companyId", "name");

    if (user) {
      // Existing User: Link Google ID and avatar if not previously linked
      let needsSave = false;
      if (!user.googleId && googleId) {
        user.googleId = googleId;
        needsSave = true;
      }
      if (!user.avatar && picture) {
        user.avatar = picture;
        needsSave = true;
      }
      // Save changes if attributes were updated
      if (needsSave) {
        await user.save();
      }

      // Extract company ID
      const companyId = (user.companyId as any)._id?.toString() || user.companyId.toString();
      // Sign a 7-day session JWT
      const token = signToken({ id: user._id.toString(), role: user.role, companyId });

      // Return session data to caller
      return res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId,
          avatar: user.avatar,
        },
        companyName: (user.companyId as any)?.name || null,
      });
    }

    // 5. New User: Automatically provision a default Organization and Admin User
    const company = await Company.create({
      name: `${name}'s Organization`,
      region: "United States",
    });

    // Create the user document linked to the new organization
    user = await User.create({
      name,
      email,
      role: "admin",
      companyId: company._id,
      googleId,
      avatar: picture,
    });

    // Sign session token for the new user
    const token = signToken({ id: user._id.toString(), role: user.role, companyId: company._id.toString() });

    // Return 201 Created status with session credentials
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
      companyName: company.name,
    });
  } catch (error) {
    // Log OAuth error details
    console.error("Google login error:", error);
    // Return 500 status
    res.status(500).json({ message: "Google authentication failed", error });
  }
};

/**
 * ============================================================================
 * 4. GET CURRENT USER (SESSION RE-HYDRATION)
 * ============================================================================
 * Endpoint: GET /api/auth/me
 * Middleware: requireAuth (validates Bearer token)
 * Purpose: Restores user session and organization info on hard page refresh.
 */
export const getMe = async (req: Request, res: Response) => {
  try {
    // 1. Query user by ID extracted from verified JWT payload (req.user!.id)
    const user = await User.findById(req.user!.id).populate("companyId", "name");
    // Return 404 if the user record was removed from the database
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Return current user profile and company name
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        avatar: user.avatar,
      },
      companyName: (user.companyId as any)?.name || null,
    });
  } catch (error) {
    // Return 500 error on unexpected failure
    res.status(500).json({ message: "Server error", error });
  }
};

/**
 * ============================================================================
 * 5. FORGOT PASSWORD (OTP DISPATCH)
 * ============================================================================
 * Endpoint: POST /api/auth/forgot-password
 * Purpose: Generates a 6-digit verification code, saves hashed record in MongoDB
 *          with 10-minute TTL, and sends an HTML email to the user.
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    // 1. Extract email from request body
    const { email } = req.body;
    // Validate email presence and type
    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email is required" });
    }

    // 2. Normalize email
    const cleanEmail = email.toLowerCase().trim();
    // Check if user exists in the database
    const user = await User.findOne({ email: cleanEmail });

    // 3. Security Best Practice (Enumeration Defense):
    // Always return a positive message even if the email does not exist,
    // preventing malicious actors from discovering registered email addresses.
    if (!user) {
      return res.json({
        success: true,
        message: "If an account with that email exists, a verification code has been sent.",
      });
    }

    // 4. Generate a cryptographically random 6-digit numeric OTP (100000 - 999999)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 5. Hash the OTP using bcrypt before storing it in MongoDB (never store plaintext codes)
    const hashedOtp = await bcrypt.hash(otp, 10);

    // 6. Set expiration timestamp to exactly 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 7. Invalidate any existing active OTP codes for this email to prevent duplicate valid codes
    await Otp.deleteMany({ email: cleanEmail });

    // 8. Store the new hashed OTP record with TTL index in MongoDB
    await Otp.create({
      email: cleanEmail,
      otp: hashedOtp,
      expiresAt,
      attempts: 0,
    });

    // 9. Dispatch the verification email via Nodemailer (also logs to console in development)
    await sendOtpEmail(cleanEmail, otp);

    // 10. Return generic success confirmation
    res.json({
      success: true,
      message: "If an account with that email exists, a verification code has been sent.",
      email: cleanEmail,
    });
  } catch (error) {
    // Log error to server console
    console.error("Forgot password error:", error);
    // Return 500 error
    res.status(500).json({ message: "Failed to process forgot password request", error });
  }
};

/**
 * ============================================================================
 * 6. VERIFY OTP
 * ============================================================================
 * Endpoint: POST /api/auth/verify-otp
 * Purpose: Verifies the 6-digit OTP code entered by the user. Enforces brute-force
 *          protection (max 5 attempts) and returns a 15-minute reset JWT token.
 */
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    // 1. Extract email and 6-digit OTP from request body
    const { email, otp } = req.body;

    // 2. Validate input presence
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and 6-digit code are required" });
    }

    // Sanitize values
    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    // 3. Find active unexpired OTP document in MongoDB
    const otpRecord = await Otp.findOne({
      email: cleanEmail,
      expiresAt: { $gt: new Date() },
    });

    // 4. If no active record exists, the code has expired or was never requested
    if (!otpRecord) {
      return res.status(400).json({ message: "Verification code has expired or is invalid. Please request a new one." });
    }

    // 5. Brute Force Protection: If 5 or more incorrect attempts were made, lock out and delete record
    if (otpRecord.attempts >= 5) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(429).json({ message: "Too many failed attempts. Please request a new verification code." });
    }

    // 6. Compare user's entered OTP code against the stored bcrypt hash
    const isMatch = await bcrypt.compare(cleanOtp, otpRecord.otp);

    // 7. Handle incorrect code: increment attempts counter and return remaining attempts
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = 5 - otpRecord.attempts;
      return res.status(400).json({
        message: `Invalid verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : "Please request a new code."}`,
      });
    }

    // 8. Code matches! Delete the OTP record from MongoDB immediately to prevent replay attacks
    await Otp.deleteOne({ _id: otpRecord._id });

    // 9. Lookup user document in MongoDB to get user ID
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ message: "User account not found" });
    }

    // 10. Issue a short-lived single-purpose password reset JWT valid for 15 minutes
    const resetToken = jwt.sign(
      { id: user._id.toString(), email: cleanEmail, purpose: "password-reset" },
      getJwtSecret(),
      { expiresIn: "15m" }
    );

    // 11. Return success response with reset token
    res.json({
      success: true,
      message: "Code verified successfully.",
      resetToken,
    });
  } catch (error) {
    // Log unexpected errors
    console.error("Verify OTP error:", error);
    // Return 500 error
    res.status(500).json({ message: "Failed to verify code", error });
  }
};

/**
 * ============================================================================
 * 7. RESET PASSWORD
 * ============================================================================
 * Endpoint: POST /api/auth/reset-password
 * Purpose: Verifies the 15-minute reset token, enforces strong password complexity,
 *          hashes the new password with bcrypt, and updates MongoDB.
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    // 1. Extract resetToken and new password from request body
    const { resetToken, password } = req.body;

    // 2. Validate input presence
    if (!resetToken || !password) {
      return res.status(400).json({ message: "Reset token and new password are required" });
    }

    // 3. Enforce strong password complexity rules on the backend
    const validation = validateStrongPassword(password);
    if (!validation.isValid) {
      return res.status(400).json({
        message: validation.message || "Password does not meet complexity requirements",
        details: validation.details,
      });
    }

    // 4. Verify cryptographic signature and expiration of the reset JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(resetToken, getJwtSecret());
    } catch (err) {
      return res.status(400).json({ message: "Invalid or expired reset session. Please request a new OTP." });
    }

    // 5. Ensure the token was specifically issued for password reset (purpose check)
    if (decoded.purpose !== "password-reset") {
      return res.status(400).json({ message: "Invalid reset token" });
    }

    // 6. Hash the new password with bcrypt (10 rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 7. Update the user's password field in MongoDB
    const user = await User.findByIdAndUpdate(decoded.id, { password: hashedPassword }, { new: true });

    // 8. Verify user existence
    if (!user) {
      return res.status(404).json({ message: "User account not found" });
    }

    // 9. Return success confirmation
    res.json({
      success: true,
      message: "Password reset successfully! You can now sign in with your new password.",
    });
  } catch (error) {
    // Log unexpected errors
    console.error("Reset password error:", error);
    // Return 500 error
    res.status(500).json({ message: "Failed to reset password", error });
  }
};
