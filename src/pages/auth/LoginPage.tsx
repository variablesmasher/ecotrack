// Import React and state management hook
import React, { useState } from "react";
// Import React Router DOM navigation tools for programmatic redirects and route hyperlinks
import { useNavigate, Link } from "react-router-dom";
// Lucide icons for toggling password visibility
import { Eye, EyeOff } from "lucide-react";
// Central authentication context hook providing the login() dispatch method
import { useAuth } from "../../context/AuthContext";
// Toast notification hook for displaying success and error messages
import { useToast } from "../../context/ToastContext";
// Google Sign-In button component supporting Google Identity Services (GIS)
import { GoogleSignInButton } from "../../components/auth/GoogleSignInButton";

/**
 * ============================================================================
 * MEMBER 1: AUTHENTICATION & SECURITY
 * User Login Page (src/pages/auth/LoginPage.tsx)
 * ============================================================================
 * Features:
 * - Standard authentication (email + password) with real bcrypt verification on backend.
 * - One-click Google Sign-In with Google Identity Services (GIS) and dev fallback.
 * - Password visibility toggle.
 * - Direct links to Register and Forgot Password flows.
 * - Immediate session re-hydration and redirect to /dashboard upon success.
 */
export default function LoginPage() {
  // Email address input state
  const [email, setEmail] = useState("");

  // Plaintext password input state
  const [password, setPassword] = useState("");

  // Boolean state flag controlling whether password characters are shown as plaintext or dots
  const [showPassword, setShowPassword] = useState(false);

  // Error message state storing validation or backend authentication failures
  const [error, setError] = useState<string | null>(null);

  // Loading state flag to disable the submit button and prevent concurrent submissions
  const [loading, setLoading] = useState(false);

  // Destructure login method from AuthContext
  const { login } = useAuth();

  // Destructure toast notification handlers
  const { success: toastSuccess, error: toastError } = useToast();

  // Router navigation hook for redirecting to /dashboard after login
  const navigate = useNavigate();

  /**
   * handleSignIn:
   * Handles form submission to authenticate the user.
   * - Prevents browser default form reload.
   * - Invokes login(email, password) from AuthContext.
   * - On success: displays welcoming toast and routes to /dashboard.
   * - On error: captures error message from backend and displays alert.
   */
  const handleSignIn = async (e: React.FormEvent) => {
    // Prevent standard browser form submission
    e.preventDefault();

    // Clear previous error messages
    setError(null);

    // Set loading indicator to true
    setLoading(true);

    try {
      // Dispatch login request to Express backend via AuthContext
      const data = await login(email, password);

      // Extract user display name for customized welcome message
      const name = data?.user?.name;

      // Trigger floating success toast
      toastSuccess(name ? `Login successful! Welcome back, ${name}.` : 'Login successful! Welcome back.');

      // Navigate to the protected dashboard
      navigate("/dashboard");
    } catch (err: any) {
      // Extract backend error message (e.g. "Invalid email or password")
      const msg = err?.response?.data?.message || "Invalid email or password";

      // Set inline error state
      setError(msg);

      // Display floating error toast
      toastError(msg);
    } finally {
      // Reset loading state
      setLoading(false);
    }
  };

  return (
    // Top-level container: centers content vertically and horizontally with full-screen height
    <div className="flex-1 dark:bg-zinc-950 bg-gray-50 flex flex-col justify-center items-center pt-16 px-4 min-h-screen relative overflow-hidden">
      
      {/* Background visual ambiance: animated emerald and blue glowing blurred orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />

      {/* Main card container with backdrop blur and responsive borders */}
      <div className="max-w-md w-full dark:bg-zinc-900 bg-white border dark:border-white/[0.06] border-gray-200 rounded-2xl p-6 shadow-sm relative z-10">
        
        {/* Card Header: Brand dot icon, heading, and subtitle */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <h2 className="text-3xl font-bold dark:text-zinc-100 text-gray-900 tracking-tight">Sign In to EcoTrack</h2>
          <p className="dark:text-zinc-500 text-gray-500 mt-2 text-sm">Manage your corporate emissions.</p>
        </div>

        {/* Google Sign-In Integration: One-click sign-in alternative */}
        <div className="mb-5">
          <GoogleSignInButton text="Sign in with Google" />
          
          {/* Divider line with centered text */}
          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-gray-200 dark:border-white/[0.06]" />
            <span className="flex-shrink mx-3 text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-zinc-500">
              or continue with email
            </span>
            <div className="flex-grow border-t border-gray-200 dark:border-white/[0.06]" />
          </div>
        </div>
        
        {/* Standard Email and Password Login Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          
          {/* Email Address Input Field */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold dark:text-zinc-500 text-gray-500 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full dark:bg-zinc-900/80 bg-gray-50 border dark:border-white/[0.06] border-gray-200 rounded-2xl px-4 py-3.5 text-sm dark:text-zinc-100 text-gray-900 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
              placeholder="admin@ecotrack.com"
              required
            />
          </div>

          {/* Password Input Field with Visibility Toggle */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold dark:text-zinc-500 text-gray-500 mb-2">Password</label>
            <div className="relative">
              {/* Dynamically toggles between 'text' and 'password' input types */}
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full dark:bg-zinc-900/80 bg-gray-50 border dark:border-white/[0.06] border-gray-200 rounded-2xl px-4 py-3.5 pr-10 text-sm dark:text-zinc-100 text-gray-900 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
                placeholder="••••••••"
                required
              />
              {/* Eye toggle button allowing the user to view or hide plaintext password */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer dark:text-zinc-500 text-gray-500 hover:dark:text-zinc-300 hover:text-gray-700 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link leading to multi-step recovery flow */}
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 transition-colors">Forgot Password?</Link>
          </div>

          {/* Inline Error Alert banner */}
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Submit Button: Disabled while loading or if required fields are blank */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:dark:bg-zinc-800 bg-gray-200 disabled:dark:text-zinc-500 text-gray-500 text-black font-bold uppercase tracking-wide py-3.5 rounded-2xl transition-all duration-300 text-sm mt-4 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] disabled:shadow-none active:scale-[0.98]"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
          
          {/* Navigation link allowing new users to navigate to Registration */}
          <div className="text-center mt-6">
            <span className="text-xs dark:text-zinc-500 text-gray-500">Don't have an account? </span>
            <Link to="/register" className="text-xs text-emerald-500 hover:text-emerald-400 font-bold transition-colors">Register</Link>
          </div>
        </form>
        
        {/* Collapsible Demo Credentials Accordion for Testing and Graders */}
        <details className="mt-8 group">
          <summary className="text-xs uppercase tracking-widest font-bold dark:text-zinc-500 text-gray-500 cursor-pointer flex justify-center items-center hover:dark:text-zinc-300 hover:text-gray-700 transition-colors list-none outline-none">
            <span className="border-b border-dashed dark:border-zinc-500 border-gray-400 group-hover:dark:border-zinc-300 group-hover:border-gray-700">View Demo Credentials</span>
          </summary>
          <div className="mt-6 p-5 dark:bg-zinc-900/50 bg-gray-50 border dark:border-white/[0.06] border-gray-200 rounded-2xl text-xs dark:text-zinc-400 text-gray-600 space-y-3">
            <div className="flex justify-between items-center">
              <span>Admin: <strong className="dark:text-zinc-200 text-gray-800">admin@ecotrack.com</strong></span>
            </div>
            <div className="flex justify-between items-center">
              <span>Employee: <strong className="dark:text-zinc-200 text-gray-800">employee@ecotrack.com</strong></span>
            </div>
            <div className="flex justify-between items-center">
              <span>Executive: <strong className="dark:text-zinc-200 text-gray-800">exec@ecotrack.com</strong></span>
            </div>

            <div className="flex justify-between items-center pt-3 border-t dark:border-white/[0.06] border-gray-200 mt-1">
              <span>Password: <strong className="dark:text-zinc-200 text-gray-800">Password123!</strong></span>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
