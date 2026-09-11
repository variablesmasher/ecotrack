// Import React and core hooks (state, lifecycle, refs)
import React, { useState, useEffect, useRef } from "react";
// Import React Router DOM tools for navigation links and programmatic redirects
import { Link, useNavigate } from "react-router-dom";
// Lucide icons: KeyRound for reset key, ArrowLeft for navigation, Mail, ShieldCheck, CheckCircle2, Eye, EyeOff, RefreshCw
import { KeyRound, ArrowLeft, Mail, ShieldCheck, CheckCircle2, Eye, EyeOff, RefreshCw } from "lucide-react";
// Configured Axios client with automatic Bearer token interceptor
import apiClient from "../../api/axiosClient";
// Toast notification hook for displaying floating success and error alerts
import { useToast } from "../../context/ToastContext";
// Animated password strength bar and requirement checklist component
import { PasswordStrengthMeter } from "../../components/auth/PasswordStrengthMeter";
// Password evaluation utility testing the 5 security criteria
import { evaluatePassword } from "../../utils/passwordValidator";

/**
 * ============================================================================
 * MEMBER 1: AUTHENTICATION & SECURITY
 * Forgot Password & Email OTP Recovery Wizard (src/pages/auth/ForgotPasswordPage.tsx)
 * ============================================================================
 * 4-Step Interactive Recovery Workflow:
 * - Step 1 (Request Code): Submits email to POST /api/auth/forgot-password. Backend
 *   generates a cryptographically random 6-digit OTP and sends it via email.
 * - Step 2 (Verify OTP): 6-digit input boxes with auto-advance, backspace navigation,
 *   paste distribution, and 60-second cooldown resend timer. Validated against MongoDB.
 * - Step 3 (New Password): Prompts for new password with real-time PasswordStrengthMeter
 *   and confirm-password matching. Updates hashed password in database.
 * - Step 4 (Success): Confirms password change and provides direct link to login.
 */
export default function ForgotPasswordPage() {
  // Navigation hook for redirecting to /login upon completion
  const navigate = useNavigate();

  // Toast notification methods
  const { success: toastSuccess, error: toastError } = useToast();

  // Multi-step state machine: 1 = email, 2 = verify OTP, 3 = new password, 4 = complete
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Email input state for password reset target
  const [email, setEmail] = useState("");

  // Array of 6 single-digit strings representing each individual OTP box
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);

  // Temporary 15-minute JWT resetToken returned by backend after successful OTP verification
  const [resetToken, setResetToken] = useState<string>("");

  // New password input state
  const [password, setPassword] = useState("");

  // Confirm new password input state
  const [confirmPassword, setConfirmPassword] = useState("");

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading state flag to disable buttons during network requests
  const [loading, setLoading] = useState(false);

  // General error banner message
  const [error, setError] = useState<string | null>(null);

  // Inline error message for password complexity failures
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Resend cooldown timer countdown in seconds
  const [countdown, setCountdown] = useState(0);

  // Array of React refs attached to each of the 6 OTP input elements for focus management
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Effect hook managing the 1-second interval tick for the resend countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    // Tick down if countdown > 0
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    // Cleanup timer on unmount or tick
    return () => clearTimeout(timer);
  }, [countdown]);

  // Effect hook: automatically focuses the first OTP digit box upon advancing to Step 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  /**
   * handleSendOtp:
   * Dispatches the initial forgot password request with user email (Step 1).
   * Calls POST /api/auth/forgot-password, moves to Step 2, and starts 60s resend timer.
   */
  const handleSendOtp = async (e: React.FormEvent) => {
    // Prevent default form refresh
    e.preventDefault();

    // Guard against empty input
    if (!email) return;

    // Reset error banner
    setError(null);

    // Set loading indicator
    setLoading(true);

    try {
      // Call backend to generate OTP and dispatch email
      const res = await apiClient.post("/auth/forgot-password", { email });

      // Display positive toast notification
      toastSuccess(res.data?.message || "Verification code sent to your email!");

      // Advance wizard to Step 2 (OTP Entry)
      setStep(2);

      // Start 60-second cooldown timer before allowing resend
      setCountdown(60);
    } catch (err: any) {
      // Capture error message from server
      const msg = err?.response?.data?.message || "Failed to send verification code.";
      setError(msg);
      toastError(msg);
    } finally {
      // Reset loading flag
      setLoading(false);
    }
  };

  /**
   * handleOtpDigitChange:
   * Handles user typing inside any of the 6 individual OTP boxes.
   * - Filters out non-digits.
   * - Sets the digit at the specified index.
   * - Automatically advances focus to the next input box.
   */
  const handleOtpDigitChange = (index: number, value: string) => {
    // Strip non-numeric characters
    const cleanVal = value.replace(/\D/g, "");
    if (!cleanVal && value) return;

    // Clone current digit array
    const newDigits = [...otpDigits];

    // Take only the last entered digit
    newDigits[index] = cleanVal.slice(-1);

    // Update state
    setOtpDigits(newDigits);

    // Clear error
    setError(null);

    // Automatically advance focus to the next box if character was entered
    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  /**
   * handleOtpKeyDown:
   * Handles keyboard navigation (e.g. Backspace moving focus to the preceding box).
   */
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // If user presses Backspace on an empty box, jump focus to previous box
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  /**
   * handleOtpPaste:
   * Allows user to copy-paste a full 6-digit code into any box and auto-fill all 6 slots.
   */
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    // Prevent default raw paste
    e.preventDefault();

    // Extract clipboard text and remove non-digits
    const pasted = e.clipboardData.getData("text").trim().replace(/\D/g, "");

    // If pasted string is exactly 6 digits, populate all boxes
    if (pasted.length === 6) {
      const digits = pasted.split("");
      setOtpDigits(digits);
      // Move focus to the final box
      otpInputRefs.current[5]?.focus();
    }
  };

  /**
   * handleVerifyOtp:
   * Submits the 6-digit OTP to the backend (Step 2).
   * Calls POST /api/auth/verify-otp, extracts resetToken, and moves to Step 3.
   */
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    // Prevent default form refresh if triggered by form submit
    if (e) e.preventDefault();

    // Combine 6 individual digit strings into single code
    const fullOtp = otpDigits.join("");

    // Validate that all 6 digits were entered
    if (fullOtp.length !== 6) {
      setError("Please enter all 6 digits of the verification code.");
      return;
    }

    // Clear error
    setError(null);

    // Set loading indicator
    setLoading(true);

    try {
      // Dispatch verification request to backend
      const res = await apiClient.post("/auth/verify-otp", { email, otp: fullOtp });

      // Store the returned single-purpose resetToken (valid for 15 mins)
      setResetToken(res.data.resetToken);

      // Display toast notification
      toastSuccess("Code verified successfully! Please choose a new password.");

      // Advance wizard to Step 3 (Set New Password)
      setStep(3);
    } catch (err: any) {
      // Capture error message (e.g. invalid code or expired)
      const msg = err?.response?.data?.message || "Invalid or expired verification code.";
      setError(msg);
      toastError(msg);
    } finally {
      // Reset loading flag
      setLoading(false);
    }
  };

  /**
   * handleResendOtp:
   * Re-requests a new 6-digit code after the countdown timer has elapsed.
   */
  const handleResendOtp = async () => {
    // Guard against resending while cooldown is active or currently loading
    if (countdown > 0 || loading) return;

    // Clear error
    setError(null);

    // Set loading indicator
    setLoading(true);

    try {
      // Call backend to generate and dispatch new code
      await apiClient.post("/auth/forgot-password", { email });

      // Reset countdown to 60 seconds
      setCountdown(60);

      // Clear previous digits
      setOtpDigits(["", "", "", "", "", ""]);

      // Display confirmation toast
      toastSuccess("New verification code sent! Check your email / console.");

      // Focus first box
      otpInputRefs.current[0]?.focus();
    } catch (err: any) {
      // Display error toast
      toastError("Failed to resend verification code.");
    } finally {
      // Reset loading flag
      setLoading(false);
    }
  };

  /**
   * handlePasswordChange:
   * Real-time password complexity evaluation in Step 3.
   */
  const handlePasswordChange = (val: string) => {
    // Update password state
    setPassword(val);

    // Check empty validation
    if (!val) {
      setPasswordError("Password is required.");
    } else {
      // Evaluate password against 5 strong rules
      const evalResult = evaluatePassword(val);
      if (!evalResult.isStrong) {
        setPasswordError("Password must satisfy all security requirements below.");
      } else {
        setPasswordError(null);
      }
    }
  };

  /**
   * handleResetPassword:
   * Submits the new password along with the verified resetToken (Step 3).
   * Calls POST /api/auth/reset-password and advances to Step 4 on success.
   */
  const handleResetPassword = async (e: React.FormEvent) => {
    // Prevent default form refresh
    e.preventDefault();

    // Clear error
    setError(null);

    // Enforce strong password complexity rules
    const evalResult = evaluatePassword(password);
    if (!evalResult.isStrong) {
      setPasswordError("Password does not meet the complexity requirements.");
      return;
    }

    // Enforce password confirmation match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Set loading indicator
    setLoading(true);

    try {
      // Dispatch password update to backend
      await apiClient.post("/auth/reset-password", {
        resetToken,
        password,
      });

      // Show success toast
      toastSuccess("Password successfully updated! You can now log in.");

      // Advance wizard to Step 4 (Success Confirmation)
      setStep(4);
    } catch (err: any) {
      // Capture error message
      const msg = err?.response?.data?.message || "Failed to reset password.";
      setError(msg);
      toastError(msg);
    } finally {
      // Reset loading flag
      setLoading(false);
    }
  };

  return (
    // Top-level container: centers content vertically and horizontally with full-screen height
    <div className="flex-1 dark:bg-zinc-950 bg-gray-50 flex flex-col justify-center items-center pt-24 pb-12 px-4 min-h-screen relative overflow-hidden">
      
      {/* Background visual ambiance: animated emerald and blue glowing blurred orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />

      {/* Main card container with backdrop blur and responsive borders */}
      <div className="max-w-md w-full dark:bg-zinc-900 bg-white border dark:border-white/[0.06] border-gray-200 rounded-3xl p-8 sm:p-10 shadow-xl relative z-10">
        
        {/* Step Progress Indicators: Displays 3 progress pills showing current stage */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? "w-8 bg-emerald-500"
                    : s < step
                    ? "w-5 bg-emerald-500/50"
                    : "w-5 bg-gray-200 dark:bg-zinc-800"
                }`}
              />
            ))}
          </div>
        )}

        {/* ─── STEP 1: Enter Registered Email Address ──────────────────── */}
        {step === 1 && (
          <div>
            {/* Header: Key icon and description */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-emerald-500">
                <KeyRound className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold dark:text-zinc-100 text-gray-900 tracking-tight">Forgot Password?</h2>
              <p className="dark:text-zinc-400 text-gray-500 mt-2 text-sm">
                Enter your registered email address to receive a 6-digit OTP verification code.
              </p>
            </div>

            {/* Email form */}
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold dark:text-zinc-500 text-gray-500 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full dark:bg-zinc-900/80 bg-gray-50 border dark:border-white/[0.06] border-gray-200 rounded-2xl px-4 py-3.5 pl-10 text-sm dark:text-zinc-100 text-gray-900 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
                    placeholder="admin@ecotrack.com"
                    required
                  />
                  {/* Leading email icon */}
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
                </div>
              </div>

              {/* Error banner */}
              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
                  {error}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold uppercase tracking-wide py-3.5 rounded-2xl transition-all duration-300 text-sm shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] active:scale-[0.98] cursor-pointer"
              >
                {loading ? "Sending OTP..." : "Send Verification Code"}
              </button>

              {/* Navigation link back to Sign In */}
              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 font-semibold transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </form>
          </div>
        )}

        {/* ─── STEP 2: Enter 6-Digit OTP Verification Code ─────────────── */}
        {step === 2 && (
          <div>
            {/* Header: Shield verification icon and target email confirmation */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-emerald-500">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold dark:text-zinc-100 text-gray-900 tracking-tight">Enter Verification Code</h2>
              <p className="dark:text-zinc-400 text-gray-500 mt-2 text-sm">
                We sent a 6-digit code to <strong className="dark:text-zinc-200 text-gray-800">{email}</strong>
              </p>
              {/* Option to return to Step 1 if typo in email */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-emerald-500 hover:underline mt-1 font-medium cursor-pointer"
              >
                Wrong email? Change
              </button>
            </div>

            {/* OTP verification form */}
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {/* 6 individual OTP input boxes with paste support */}
              <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { otpInputRefs.current[idx] = el; }}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-2xl border bg-gray-50 dark:bg-zinc-800/80 border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              {/* Error banner */}
              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-center">
                  {error}
                </div>
              )}

              {/* Verify submit button */}
              <button
                type="submit"
                disabled={loading || otpDigits.some((d) => !d)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold uppercase tracking-wide py-3.5 rounded-2xl transition-all duration-300 text-sm shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] active:scale-[0.98] cursor-pointer"
              >
                {loading ? "Verifying Code..." : "Verify Code"}
              </button>

              {/* Resend timer or action button */}
              <div className="text-center text-xs text-gray-500 dark:text-zinc-400">
                {countdown > 0 ? (
                  <span>Resend code in <strong className="text-emerald-500">{countdown}s</strong></span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-emerald-500 hover:text-emerald-400 font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Resend Code
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ─── STEP 3: Set New Password ───────────────────────────────── */}
        {step === 3 && (
          <div>
            {/* Header: Key icon and description */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-emerald-500">
                <KeyRound className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold dark:text-zinc-100 text-gray-900 tracking-tight">Create New Password</h2>
              <p className="dark:text-zinc-400 text-gray-500 mt-2 text-sm">
                Choose a strong password to protect your EcoTrack account.
              </p>
            </div>

            {/* Password reset form */}
            <form onSubmit={handleResetPassword} className="space-y-5">
              
              {/* New Password input */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold dark:text-zinc-500 text-gray-500 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className="w-full dark:bg-zinc-900/80 bg-gray-50 border dark:border-white/[0.06] border-gray-200 rounded-2xl px-4 py-3.5 pr-10 text-sm dark:text-zinc-100 text-gray-900 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    placeholder="••••••••"
                    required
                  />
                  {/* Eye toggle button */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer dark:text-zinc-500 text-gray-500 hover:dark:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Password Strength Meter */}
                <PasswordStrengthMeter password={password} />
                {/* Inline error */}
                {passwordError && (
                  <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{passwordError}</p>
                )}
              </div>

              {/* Confirm New Password input */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold dark:text-zinc-500 text-gray-500 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full dark:bg-zinc-900/80 bg-gray-50 border dark:border-white/[0.06] border-gray-200 rounded-2xl px-4 py-3.5 pr-10 text-sm dark:text-zinc-100 text-gray-900 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    placeholder="••••••••"
                    required
                  />
                  {/* Eye toggle button */}
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer dark:text-zinc-500 text-gray-500 hover:dark:text-zinc-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Password match mismatch error */}
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
                )}
              </div>

              {/* Error banner */}
              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
                  {error}
                </div>
              )}

              {/* Submit update password button */}
              <button
                type="submit"
                disabled={loading || !password || !confirmPassword || password !== confirmPassword}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold uppercase tracking-wide py-3.5 rounded-2xl transition-all duration-300 text-sm shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] active:scale-[0.98] cursor-pointer"
              >
                {loading ? "Updating Password..." : "Update Password"}
              </button>
            </form>
          </div>
        )}

        {/* ─── STEP 4: Success Confirmation ───────────────────────────── */}
        {step === 4 && (
          <div className="text-center py-4">
            {/* Animated green checkmark badge */}
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-emerald-500 animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-bold dark:text-zinc-100 text-gray-900 tracking-tight">Password Reset Complete!</h2>
            <p className="dark:text-zinc-400 text-gray-500 mt-3 text-sm leading-relaxed">
              Your password has been successfully reset. You can now sign in to your EcoTrack account with your new credentials.
            </p>

            {/* Direct button to sign in */}
            <div className="mt-8">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-wide py-3.5 rounded-2xl transition-all duration-300 text-sm shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] active:scale-[0.98] cursor-pointer"
              >
                Sign In Now
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
