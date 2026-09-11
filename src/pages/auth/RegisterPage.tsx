import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
// Lucide icons: Leaf for EcoTrack branding, Eye and EyeOff for toggling password visibility
import { Leaf, Eye, EyeOff } from "lucide-react";
// Central authentication context hook providing the register() dispatch method
import { useAuth } from "../../context/AuthContext";
// Standard list of world countries for corporate region selection
import { COUNTRIES } from "../../constants/regions";
// Custom accessible dropdown select component
import { Select } from "../../components/ui/Select";
// Notification toast hook for presenting floating success and error alerts
import { useToast } from "../../context/ToastContext";
// Google Sign-In / Sign-Up component integrated with Google Identity Services (GIS)
import { GoogleSignInButton } from "../../components/auth/GoogleSignInButton";
// Animated password strength bar and requirement checklist component
import { PasswordStrengthMeter } from "../../components/auth/PasswordStrengthMeter";
// Password evaluation utility testing 5 security criteria (length, upper, lower, number, symbol)
import { evaluatePassword } from "../../utils/passwordValidator";

/**
 * ============================================================================
 * MEMBER 1: AUTHENTICATION & SECURITY
 * User & Organization Registration Page (src/pages/auth/RegisterPage.tsx)
 * ============================================================================
 * Architecture & Responsibilities:
 * 1. Multi-Tenant Onboarding: Captures company details along with the primary
 *    administrator's personal credentials.
 * 2. Real-Time Password Security: Computes cryptographic password strength on
 *    every keystroke and displays visual feedback via PasswordStrengthMeter.
 * 3. Client-Side Guarding: Restricts form submission until all 5 strong password
 *    rules and confirm-password matches are satisfied.
 * 4. Google OAuth 2.0 Alternative: Offers seamless one-click Google registration.
 * 5. State Management & Navigation: Connects with AuthContext to sign and store
 *    a real JWT session, then routes to /onboarding.
 */
export default function RegisterPage() {
  // Hook for programmatic client-side routing (e.g. redirecting after successful registration)
  const navigate = useNavigate();

  // Extract the register method from AuthContext to communicate with POST /api/auth/register
  const { register } = useAuth();

  // Extract toast notification functions for interactive user feedback
  const { success: toastSuccess, error: toastError } = useToast();

  // Form state storing all registration inputs in a unified object
  const [formData, setFormData] = useState({
    companyName: "",       // Name of the corporate entity registering
    region: "",            // Selected country / operating jurisdiction
    name: "",              // Admin user's full name
    email: "",             // Admin user's corporate email address
    password: "",          // Plaintext password to be validated and hashed
    confirmPassword: ""    // Password confirmation to prevent typos
  });

  // Boolean state toggles for showing/hiding password plaintext
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field-specific validation error messages displayed directly below inputs
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  // General server or network error message displayed at the bottom of the form
  const [error, setError] = useState<string | null>(null);

  // Loading state flag to disable buttons and show progress indicators during API calls
  const [loading, setLoading] = useState(false);

  /**
   * handlePasswordChange:
   * Real-time handler invoked whenever the user types into the Password input field.
   * - Updates password state in formData.
   * - Evaluates strength using evaluatePassword() across 5 security criteria.
   * - Sets or clears password error message.
   * - Re-validates confirmPassword matching if a confirm password was already typed.
   */
  const handlePasswordChange = (value: string) => {
    // 1. Update the password field in form state
    setFormData({ ...formData, password: value });

    // 2. Validate empty check
    if (value.trim().length === 0) {
      setPasswordError("Password is required.");
    } else {
      // 3. Evaluate password against strong password rules (upper, lower, digit, symbol, min 8 chars)
      const evaluation = evaluatePassword(value);
      if (!evaluation.isStrong) {
        setPasswordError("Password must satisfy all strength requirements below.");
      } else {
        // Password meets all 5 criteria: clear error
        setPasswordError(null);
      }
    }

    // 4. Re-evaluate password match if confirmPassword already contains text
    if (formData.confirmPassword && value !== formData.confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
    } else {
      setConfirmPasswordError(null);
    }
  };

  /**
   * handleConfirmPasswordChange:
   * Real-time handler invoked whenever the user types into the Confirm Password field.
   * - Updates confirmPassword state in formData.
   * - Checks that the value exactly matches formData.password.
   */
  const handleConfirmPasswordChange = (value: string) => {
    // 1. Update confirmPassword in form state
    setFormData({ ...formData, confirmPassword: value });

    // 2. Validate empty check
    if (value.trim().length === 0) {
      setConfirmPasswordError("Confirm Password is required.");
    } else if (value !== formData.password) {
      // 3. Flag mismatch if values differ
      setConfirmPasswordError("Passwords do not match.");
    } else {
      // 4. Passwords match: clear error
      setConfirmPasswordError(null);
    }
  };

  /**
   * handleSubmit:
   * Dispatches user registration to the backend upon form submission.
   * - Prevents browser default form refresh.
   * - Verifies password strength and confirmation match before network dispatch.
   * - Calls AuthContext.register() which invokes POST /api/auth/register.
   * - On success: displays success toast and navigates to the onboarding questionnaire.
   * - On error: captures backend error message (e.g. duplicate email) and displays alert.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent the default browser page reload
    e.preventDefault();

    // Reset previous general error message
    setError(null);

    // Sanitize values by trimming leading and trailing whitespace
    const trimmedPassword = formData.password.trim();
    const trimmedConfirm = formData.confirmPassword.trim();

    // Validate password existence
    if (!trimmedPassword) {
      setPasswordError("Password is required.");
      return;
    }

    // Enforce strong password complexity rules before sending to server
    const evalResult = evaluatePassword(trimmedPassword);
    if (!evalResult.isStrong) {
      setPasswordError("Password does not meet all security requirements.");
      return;
    }

    // Validate confirm password existence
    if (!trimmedConfirm) {
      setConfirmPasswordError("Confirm Password is required.");
      return;
    }

    // Validate password match
    if (trimmedPassword !== trimmedConfirm) {
      setConfirmPasswordError("Passwords do not match.");
      return;
    }

    // Begin network request: set loading to true to disable submit button
    setLoading(true);

    try {
      // Execute registration via AuthContext (hashes password on server & saves company + user)
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        companyName: formData.companyName,
        region: formData.region
      });

      // Show positive confirmation toast
      toastSuccess('Account created successfully! Welcome to EcoTrack.');

      // Route newly registered admin to onboarding setup
      navigate("/onboarding");
    } catch (err: any) {
      // Extract error message returned by server or fallback to a friendly default
      const msg = err?.response?.data?.message || "Registration failed. Please try again.";
      setError(msg);
      toastError(msg);
    } finally {
      // Ensure loading state is reset regardless of outcome
      setLoading(false);
    }
  };

  return (
    // Top-level container: centers content vertically and horizontally with full-screen height
    <div className="flex-1 dark:bg-zinc-950 bg-gray-50 flex flex-col justify-center items-center pt-28 pb-12 px-4 min-h-screen relative overflow-hidden">
      
      {/* Background visual ambiance: animated emerald and blue glowing blurred orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />

      {/* Main card container: glassmorphic backdrop blur with adaptive dark and light theme borders */}
      <div className="max-w-xl w-full dark:bg-zinc-900/80 bg-white/80 backdrop-blur-xl border dark:border-white/[0.06] border-gray-200 rounded-2xl p-10 pb-12 shadow-sm relative z-10">
        
        {/* Card Header: Brand leaf icon, heading, and subtitle */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Leaf className="w-6 h-6 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-light dark:text-zinc-100 text-gray-900 tracking-tight">Create an Account</h2>
          <p className="dark:text-zinc-500 text-gray-500 mt-3 text-sm">Join EcoTrack and manage your corporate emissions.</p>
        </div>

        {/* Google Sign-Up Integration: One-click sign-up alternative */}
        <div className="mb-8">
          <GoogleSignInButton text="Sign up with Google" />

          {/* Divider line with centered text */}
          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-gray-200 dark:border-white/[0.06]" />
            <span className="flex-shrink mx-3 text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-zinc-500">
              or register with email
            </span>
            <div className="flex-grow border-t border-gray-200 dark:border-white/[0.06]" />
          </div>
        </div>
        
        {/* Main Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Responsive 2-column grid layout for form inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Input 1: Company Name (Spans full width across 2 columns) */}
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-widest font-bold dark:text-zinc-500 text-gray-500 mb-2">Company Name</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={e => setFormData({...formData, companyName: e.target.value})}
                className="w-full dark:bg-zinc-800 bg-gray-50 border dark:border-white/[0.06] border-gray-200 rounded-lg px-4 py-3 text-sm dark:text-zinc-100 text-gray-900 focus:outline-none focus:border-emerald-500/50 transition-colors"
                placeholder="Acme Corp"
                required
              />
            </div>

            {/* Input 2: Country / Region (Spans full width across 2 columns) */}
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-widest font-bold dark:text-zinc-500 text-gray-500 mb-2">Country</label>
              <Select
                value={formData.region}
                onChange={value => setFormData({...formData, region: value})}
                placeholder="Select a country..."
                options={[
                  { value: '', label: 'Select a country...', disabled: true },
                  ...COUNTRIES.map((country) => ({ value: country, label: country }))
                ]}
              />
            </div>

            {/* Input 3: Admin Full Name */}
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold dark:text-zinc-500 text-gray-500 mb-2">Your Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full dark:bg-zinc-800 bg-gray-50 border dark:border-white/[0.06] border-gray-200 rounded-lg px-4 py-3 text-sm dark:text-zinc-100 text-gray-900 focus:outline-none focus:border-emerald-500/50 transition-colors"
                placeholder="John Doe"
                required
              />
            </div>

            {/* Input 4: Corporate Email Address */}
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold dark:text-zinc-500 text-gray-500 mb-2">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full dark:bg-zinc-800 bg-gray-50 border dark:border-white/[0.06] border-gray-200 rounded-lg px-4 py-3 text-sm dark:text-zinc-100 text-gray-900 focus:outline-none focus:border-emerald-500/50 transition-colors"
                placeholder="john@acme.com"
                required
              />
            </div>

            {/* Input 5: Password with visibility toggle & real-time strength meter */}
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-widest font-bold dark:text-zinc-500 text-gray-500 mb-2">Password</label>
              <div className="relative">
                {/* Dynamically toggles between 'text' and 'password' input types */}
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={e => handlePasswordChange(e.target.value)}
                  className={`w-full dark:bg-zinc-800 bg-gray-50 border ${
                    passwordError
                      ? 'border-red-500/50 focus:border-red-500/50'
                      : 'dark:border-white/[0.06] border-gray-200 focus:border-emerald-500/50'
                  } rounded-lg px-4 py-3 pr-10 text-sm dark:text-zinc-100 text-gray-900 focus:outline-none transition-colors`}
                  placeholder="••••••••"
                  required
                />
                {/* Eye toggle button allowing the user to view or hide plaintext password */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer dark:text-zinc-500 text-gray-400 hover:dark:text-zinc-300 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Real-time Password Strength Meter: shows 4-stage colored bar and 5-item requirement checklist */}
              <PasswordStrengthMeter password={formData.password} />

              {/* Inline error message when password fails complexity criteria */}
              {passwordError && (
                <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{passwordError}</p>
              )}
            </div>

            {/* Input 6: Confirm Password with visibility toggle & match validation */}
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-widest font-bold dark:text-zinc-500 text-gray-500 mb-2">Confirm Password</label>
              <div className="relative">
                {/* Dynamically toggles between 'text' and 'password' input types */}
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={e => handleConfirmPasswordChange(e.target.value)}
                  className={`w-full dark:bg-zinc-800 bg-gray-50 border ${
                    confirmPasswordError
                      ? 'border-red-500/50 focus:border-red-500/50'
                      : 'dark:border-white/[0.06] border-gray-200 focus:border-emerald-500/50'
                  } rounded-lg px-4 py-3 pr-10 text-sm dark:text-zinc-100 text-gray-900 focus:outline-none transition-colors`}
                  placeholder="••••••••"
                  required
                />
                {/* Eye toggle button for confirm password input */}
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer dark:text-zinc-500 text-gray-400 hover:dark:text-zinc-300 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Inline error message when passwords do not match */}
              {confirmPasswordError && (
                <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{confirmPasswordError}</p>
              )}
            </div>
          </div>
          
          {/* General error notification banner displayed when backend registration fails */}
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mt-6">
              {error}
            </div>
          )}

          {/* Form Submit Button: Disabled while loading to prevent concurrent submissions */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:dark:bg-zinc-800 bg-gray-200 disabled:dark:text-zinc-500 text-gray-500 text-black font-bold uppercase tracking-wide py-3.5 rounded-lg transition-colors text-sm mt-10"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
          
          {/* Navigation link allowing users with existing accounts to navigate to Sign In */}
          <div className="text-center pt-2">
            <span className="text-xs dark:text-zinc-500 text-gray-500">Already have an account? </span>
            <Link to="/login" className="text-xs text-emerald-500 hover:text-emerald-400 font-bold transition-colors">Sign In</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
