// Import Mongoose and core schema interfaces
import mongoose, { Schema, Document } from "mongoose";

/**
 * ============================================================================
 * MEMBER 1: AUTHENTICATION & SECURITY
 * User Mongoose Model (server/models/User.ts)
 * ============================================================================
 * Represents a registered user in the EcoTrack sustainability platform.
 * Supports standard credential authentication and Google OAuth 2.0.
 */

// TypeScript interface defining all fields and document methods on a User
export interface IUser extends Document {
  name: string;                               // User's full display name
  email: string;                              // Unique email address used for login and notifications
  password?: string;                          // Bcrypt password hash (optional for Google OAuth users)
  role: 'admin' | 'employee' | 'executive';   // Authorization role used for RBAC decisions
  companyId: mongoose.Types.ObjectId;         // Reference to the Company entity (multi-tenancy)
  departmentId?: mongoose.Types.ObjectId;     // Optional reference to Department (e.g. HR, Logistics)
  googleId?: string;                          // Google sub ID for users linked with Google Sign-In
  avatar?: string;                            // Profile image URL (from Google profile or avatar generator)
  createdAt: Date;                            // Timestamp when user registered
}

// Define the Mongoose schema mapping to the 'users' collection in MongoDB
const UserSchema: Schema = new Schema({
  // Full Name: required string
  name: { type: String, required: true },

  // Email: unique, automatically lowercased and trimmed to prevent duplicate registrations
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },

  // Password Hash:
  // select: false ensures the password hash is NEVER returned in queries by default
  // (e.g. User.find(), Company lookups). The authController explicitly opts in using
  // .select("+password") only when comparing credentials during login.
  // Optional for users authenticated exclusively through Google OAuth.
  password: { type: String, select: false },

  // Role: restricted to 'admin', 'employee', or 'executive' (enforces RBAC consistency)
  role: { type: String, enum: ['admin', 'employee', 'executive'], required: true },

  // Company Reference: foreign key ObjectId referencing the 'Company' collection
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },

  // Department Reference: optional foreign key ObjectId referencing the 'Department' collection
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },

  // Google OAuth ID: sparse index allows null/undefined while maintaining uniqueness for Google users
  googleId: { type: String, sparse: true },

  // Avatar URL: image URL provided by Google profile
  avatar: { type: String },

  // Creation Date: defaults to the current UTC timestamp
  createdAt: { type: Date, default: Date.now },
});

// Export the compiled Mongoose model for User documents
export default mongoose.model<IUser>("User", UserSchema);
