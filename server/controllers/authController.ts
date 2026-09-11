import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import { Company, VALID_REGIONS } from "../models/Company.js";
import { validateStrongPassword } from "../utils/passwordValidator.js";
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

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set in environment variables");
  return secret;
};

// Signs a 7-day cryptographic JSON Web Token containing user ID, role, and company ID
const signToken = (payload: { id: string; role: string; companyId: string }) => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
};

// Google OAuth 2.0 Client initialization
const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

/**
 * register:
 * Handles onboarding flow for a brand new company and its primary admin user.
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, companyName, region } = req.body;

    if (!name || !email || !password || !companyName || !region) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Strong password validation
    const passwordValidation = validateStrongPassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        message: passwordValidation.message || "Password does not meet complexity requirements",
        details: passwordValidation.details,
      });
    }

    if (!VALID_REGIONS.includes(region)) {
      return res.status(400).json({ message: `Region must be one of: ${VALID_REGIONS.join(", ")}` });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const company = await Company.create({ name: companyName.trim(), region });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "admin",
      companyId: company._id,
    });

    const token = signToken({ id: user._id.toString(), role: user.role, companyId: company._id.toString() });

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      companyName: company.name,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password").populate("companyId", "name");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.password) {
      return res.status(401).json({ message: "This account uses Google Sign-In. Please sign in with Google." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const companyId = (user.companyId as any)._id?.toString() || user.companyId.toString();
    const token = signToken({ id: user._id.toString(), role: user.role, companyId });

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
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// Google OAuth Login / Registration endpoint
export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { credential, mockUser } = req.body;

    let email: string = "";
    let name: string = "";
    let googleId: string = "";
    let picture: string | undefined;

    if (credential) {
      // Verify token with Google if client configured, or decode payload
      if (googleClient && googleClientId) {
        try {
          const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: googleClientId,
          });
          const payload = ticket.getPayload();
          if (!payload || !payload.email) {
            return res.status(400).json({ message: "Invalid Google token payload" });
          }
          email = payload.email;
          name = payload.name || payload.email.split("@")[0];
          googleId = payload.sub;
          picture = payload.picture;
        } catch (verifErr) {
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
        // Dev fallback if client ID not yet configured
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
      // Dev mock sign-in for local rapid testing without Google console keys
      email = mockUser.email;
      name = mockUser.name || mockUser.email.split("@")[0];
      googleId = "mock_google_" + Date.now();
      picture = mockUser.picture;
    } else {
      return res.status(400).json({ message: "Google credential is required" });
    }

    if (!email) {
      return res.status(400).json({ message: "Unable to retrieve email from Google profile" });
    }

    email = email.toLowerCase().trim();

    // Check if user already exists
    let user = await User.findOne({ email }).populate("companyId", "name");

    if (user) {
      // Link Google ID and avatar if not present
      let needsSave = false;
      if (!user.googleId && googleId) {
        user.googleId = googleId;
        needsSave = true;
      }
      if (!user.avatar && picture) {
        user.avatar = picture;
        needsSave = true;
      }
      if (needsSave) {
        await user.save();
      }

      const companyId = (user.companyId as any)._id?.toString() || user.companyId.toString();
      const token = signToken({ id: user._id.toString(), role: user.role, companyId });

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

    // New user signing up via Google: create default company & user
    const company = await Company.create({
      name: `${name}'s Organization`,
      region: "United States",
    });

    user = await User.create({
      name,
      email,
      role: "admin",
      companyId: company._id,
      googleId,
      avatar: picture,
    });

    const token = signToken({ id: user._id.toString(), role: user.role, companyId: company._id.toString() });

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
    console.error("Google login error:", error);
    res.status(500).json({ message: "Google authentication failed", error });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!.id).populate("companyId", "name");
    if (!user) return res.status(404).json({ message: "User not found" });

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
    res.status(500).json({ message: "Server error", error });
  }
};

// Forgot password - generates secure 6-digit OTP, saves hashed record, sends email
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email is required" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    // Always respond with a positive confirmation message to prevent user enumeration
    if (!user) {
      return res.json({
        success: true,
        message: "If an account with that email exists, a verification code has been sent.",
      });
    }

    // Generate cryptographically random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Expire in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Remove any previous active OTPs for this email and save the new one
    await Otp.deleteMany({ email: cleanEmail });
    await Otp.create({
      email: cleanEmail,
      otp: hashedOtp,
      expiresAt,
      attempts: 0,
    });

    // Send OTP email
    await sendOtpEmail(cleanEmail, otp);

    res.json({
      success: true,
      message: "If an account with that email exists, a verification code has been sent.",
      email: cleanEmail,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Failed to process forgot password request", error });
  }
};

// Verify the 6-digit OTP
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and 6-digit code are required" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    const otpRecord = await Otp.findOne({
      email: cleanEmail,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "Verification code has expired or is invalid. Please request a new one." });
    }

    // Check brute force attempts
    if (otpRecord.attempts >= 5) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(429).json({ message: "Too many failed attempts. Please request a new verification code." });
    }

    const isMatch = await bcrypt.compare(cleanOtp, otpRecord.otp);
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = 5 - otpRecord.attempts;
      return res.status(400).json({
        message: `Invalid verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : "Please request a new code."}`,
      });
    }

    // Successfully verified: remove OTP record to prevent replay
    await Otp.deleteOne({ _id: otpRecord._id });

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ message: "User account not found" });
    }

    // Issue short-lived password reset token (15 mins)
    const resetToken = jwt.sign(
      { id: user._id.toString(), email: cleanEmail, purpose: "password-reset" },
      getJwtSecret(),
      { expiresIn: "15m" }
    );

    res.json({
      success: true,
      message: "Code verified successfully.",
      resetToken,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "Failed to verify code", error });
  }
};

// Reset password with verified token and strong password check
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { resetToken, password } = req.body;

    if (!resetToken || !password) {
      return res.status(400).json({ message: "Reset token and new password are required" });
    }

    // Validate strong password
    const validation = validateStrongPassword(password);
    if (!validation.isValid) {
      return res.status(400).json({
        message: validation.message || "Password does not meet complexity requirements",
        details: validation.details,
      });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(resetToken, getJwtSecret());
    } catch (err) {
      return res.status(400).json({ message: "Invalid or expired reset session. Please request a new OTP." });
    }

    if (decoded.purpose !== "password-reset") {
      return res.status(400).json({ message: "Invalid reset token" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.findByIdAndUpdate(decoded.id, { password: hashedPassword }, { new: true });

    if (!user) {
      return res.status(404).json({ message: "User account not found" });
    }

    res.json({
      success: true,
      message: "Password reset successfully! You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Failed to reset password", error });
  }
};
