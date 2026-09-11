// Import Mongoose schema and document typing interfaces
import mongoose, { Schema, Document } from "mongoose";

/**
 * ============================================================================
 * MEMBER 1: AUTHENTICATION & SECURITY
 * OTP (One-Time Password) Mongoose Model (server/models/Otp.ts)
 * ============================================================================
 * Stores temporary 6-digit verification codes generated for password reset.
 * Features automatic MongoDB TTL expiration and brute-force attempt counters.
 */

// TypeScript interface defining an OTP verification document
export interface IOtp extends Document {
  email: string;      // Recipient email address requesting password reset
  otp: string;        // Bcrypt hash of the 6-digit verification code
  expiresAt: Date;    // Expiration timestamp (10 minutes after creation)
  attempts: number;   // Number of failed verification attempts (locks out at 5)
  createdAt: Date;    // Timestamp when OTP was generated
}

// Define the Mongoose schema for the 'otps' collection
const OtpSchema: Schema = new Schema({
  // Email: lowercase and indexed for fast lookup during verification
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },

  // OTP Code: hashed using bcrypt before insertion (never stored in plaintext)
  otp: {
    type: String,
    required: true,
  },

  // Expiration Timestamp with MongoDB TTL Index:
  // index: { expires: 0 } instructs MongoDB's background TTL thread to automatically
  // delete the document as soon as the current time exceeds expiresAt.
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },

  // Failed Attempts Counter:
  // Incremented whenever an incorrect code is submitted.
  // When attempts >= 5, the OTP document is deleted to lock out brute-force attacks.
  attempts: {
    type: Number,
    default: 0,
  },

  // Creation timestamp
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Export the compiled Mongoose model for OTP documents
export default mongoose.model<IOtp>("Otp", OtpSchema);
