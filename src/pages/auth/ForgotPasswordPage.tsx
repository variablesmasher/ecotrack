import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, ArrowLeft, Mail, ShieldCheck, CheckCircle2, Eye, EyeOff, RefreshCw } from "lucide-react";
import apiClient from "../../api/axiosClient";
import { useToast } from "../../context/ToastContext";
import { PasswordStrengthMeter } from "../../components/auth/PasswordStrengthMeter";
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
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  // Step 1: email, Step 2: otp, Step 3: new password, Step 4: done
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resetToken, setResetToken] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Refs for 6 OTP boxes
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown for resend OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Focus first digit when arriving at Step 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // Step 1: Send OTP to email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/forgot-password", { email });
      toastSuccess(res.data?.message || "Verification code sent to your email!");
      setStep(2);
      setCountdown(60);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to send verification code.";
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle OTP input changes
  const handleOtpDigitChange = (index: number, value: string) => {
    // Only accept numbers
    const cleanVal = value.replace(/\D/g, "");
    if (!cleanVal && value) return;

    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal.slice(-1);
    setOtpDigits(newDigits);
    setError(null);

    // Auto advance to next input
    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim().replace(/\D/g, "");
    if (pasted.length === 6) {
      const digits = pasted.split("");
      setOtpDigits(digits);
      otpInputRefs.current[5]?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otpDigits.join("");
    if (fullOtp.length !== 6) {
      setError("Please enter all 6 digits of the verification code.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/verify-otp", { email, otp: fullOtp });
      setResetToken(res.data.resetToken);
      toastSuccess("Code verified successfully! Please choose a new password.");
      setStep(3);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Invalid or expired verification code.";
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (countdown > 0 || loading) return;
    setError(null);
    setLoading(true);
    try {
      await apiClient.post("/auth/forgot-password", { email });
      setCountdown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      toastSuccess("New verification code sent! Check your email / console.");
      otpInputRefs.current[0]?.focus();
    } catch (err: any) {
      toastError("Failed to resend verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Handle password change
  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (!val) {
      setPasswordError("Password is required.");
    } else {
      const evalResult = evaluatePassword(val);
      if (!evalResult.isStrong) {
        setPasswordError("Password must satisfy all security requirements below.");
      } else {
        setPasswordError(null);
      }
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const evalResult = evaluatePassword(password);
    if (!evalResult.isStrong) {
      setPasswordError("Password does not meet the complexity requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/auth/reset-password", {
        resetToken,
        password,
      });
      toastSuccess("Password successfully updated! You can now log in.");
      setStep(4);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to reset password.";
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 dark:bg-zinc-950 bg-gray-50 flex flex-col justify-center items-center pt-24 pb-12 px-4 min-h-screen relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />

      <div className="max-w-md w-full dark:bg-zinc-900 bg-white border dark:border-white/[0.06] border-gray-200 rounded-3xl p-8 sm:p-10 shadow-xl relative z-10">
        
        {/* Step Indicators */}
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

        {/* STEP 1: Enter Email */}
        {step === 1 && (
          <div>
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-emerald-500">
                <KeyRound className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold dark:text-zinc-100 text-gray-900 tracking-tight">Forgot Password?</h2>
              <p className="dark:text-zinc-400 text-gray-500 mt-2 text-sm">
                Enter your registered email address to receive a 6-digit OTP verification code.
              </p>
            </div>

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
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold uppercase tracking-wide py-3.5 rounded-2xl transition-all duration-300 text-sm shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] active:scale-[0.98] cursor-pointer"
              >
                {loading ? "Sending OTP..." : "Send Verification Code"}
              </button>

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

        {/* STEP 2: Enter 6-Digit OTP */}
        {step === 2 && (
          <div>
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-emerald-500">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold dark:text-zinc-100 text-gray-900 tracking-tight">Enter Verification Code</h2>
              <p className="dark:text-zinc-400 text-gray-500 mt-2 text-sm">
                We sent a 6-digit code to <strong className="dark:text-zinc-200 text-gray-800">{email}</strong>
              </p>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-emerald-500 hover:underline mt-1 font-medium cursor-pointer"
              >
                Wrong email? Change
              </button>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {/* 6-box OTP input */}
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

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otpDigits.some((d) => !d)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold uppercase tracking-wide py-3.5 rounded-2xl transition-all duration-300 text-sm shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] active:scale-[0.98] cursor-pointer"
              >
                {loading ? "Verifying Code..." : "Verify Code"}
              </button>

              {/* Resend timer */}
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

        {/* STEP 3: Set New Password */}
        {step === 3 && (
          <div>
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-emerald-500">
                <KeyRound className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold dark:text-zinc-100 text-gray-900 tracking-tight">Create New Password</h2>
              <p className="dark:text-zinc-400 text-gray-500 mt-2 text-sm">
                Choose a strong password to protect your EcoTrack account.
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-5">
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
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer dark:text-zinc-500 text-gray-500 hover:dark:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrengthMeter password={password} />
                {passwordError && (
                  <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{passwordError}</p>
                )}
              </div>

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
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer dark:text-zinc-500 text-gray-500 hover:dark:text-zinc-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
                )}
              </div>

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
                  {error}
                </div>
              )}

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

        {/* STEP 4: Success Confirmation */}
        {step === 4 && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-emerald-500 animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-bold dark:text-zinc-100 text-gray-900 tracking-tight">Password Reset Complete!</h2>
            <p className="dark:text-zinc-400 text-gray-500 mt-3 text-sm leading-relaxed">
              Your password has been successfully reset. You can now sign in to your EcoTrack account with your new credentials.
            </p>

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
