/**
 * ============================================================================
 * MEMBER 1: AUTHENTICATION & SECURITY
 * UI Component: Google Sign-In Button with Official GSI & Local Fallback
 * File: src/components/auth/GoogleSignInButton.tsx
 * ============================================================================
 * 
 * Purpose:
 * - Implements the Google Identity Services (GSI) OAuth 2.0 client workflow.
 * - When `VITE_GOOGLE_CLIENT_ID` is present, initializes `window.google.accounts.id`,
 *   renders the official Google-styled button, and processes the returned JWT ID token.
 * - When `VITE_GOOGLE_CLIENT_ID` is absent (development or offline evaluation mode),
 *   presents an interactive modal allowing team members to test instant Google login
 *   without requiring Google Cloud console setup.
 */

// Import React and necessary lifecycle hooks (useEffect, useRef, useState)
import React, { useEffect, useRef, useState } from "react";
// Import useAuth hook to trigger backend googleLogin authentication
import { useAuth } from "../../context/AuthContext";
// Import useToast hook to display success and error banners
import { useToast } from "../../context/ToastContext";
// Import useNavigate to redirect user to dashboard upon successful Google authentication
import { useNavigate } from "react-router-dom";

// Extend Window interface so TypeScript recognizes the global 'google' SDK loaded from https://accounts.google.com/gsi/client
declare global {
  interface Window {
    google?: any;
  }
}

// Props interface for the Google button component
interface Props {
  // Optional button text (defaults to "Continue with Google")
  text?: string;
}

// Export the GoogleSignInButton functional component
export const GoogleSignInButton: React.FC<Props> = ({ text = "Continue with Google" }) => {
  // Extract googleLogin method from Member 1 AuthContext
  const { googleLogin } = useAuth();
  // Extract toast notification triggers
  const { success: toastSuccess, error: toastError } = useToast();
  // React Router navigation helper
  const navigate = useNavigate();
  // Ref container where Google Identity Services injects its native iframe button
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Local state tracking in-flight authentication network requests
  const [loading, setLoading] = useState(false);
  // Local state controlling the visibility of the offline development simulation modal
  const [showDemoModal, setShowDemoModal] = useState(false);
  // Default mock Google email for test simulation
  const [demoEmail, setDemoEmail] = useState("google.demo@ecotrack.com");
  // Default mock Google profile name for test simulation
  const [demoName, setDemoName] = useState("Google EcoTrack User");

  // Read Google OAuth 2.0 Web Client ID from Vite environment variables
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  /**
   * Callback invoked by Google's native GSI library once the user completes Google login.
   * 
   * @param response - Google OAuth credential response containing `response.credential` (JWT ID token)
   */
  const handleCredentialResponse = async (response: any) => {
    // Validate that Google returned a valid credential string
    if (!response?.credential) {
      toastError("Failed to receive Google credential.");
      return;
    }

    // Set loading indicator
    setLoading(true);
    try {
      // Send the Google JWT credential to backend endpoint: POST /api/auth/google
      const data = await googleLogin(response.credential);
      // Display greeting toast with user name
      toastSuccess(`Signed in as ${data?.user?.name || "Google User"}!`);
      // Redirect to the protected dashboard
      navigate("/dashboard");
    } catch (err: any) {
      // Log any authentication failure
      console.error("Google Auth error:", err);
      // Display error message from server
      toastError(err?.response?.data?.message || "Google sign-in failed.");
    } finally {
      // Clear loading state
      setLoading(false);
    }
  };

  /**
   * Effect hook to initialize Google Identity Services once window.google is loaded in DOM.
   */
  useEffect(() => {
    // If client ID is not configured in .env, do not attempt to load official SDK
    if (!googleClientId) return;

    // Poll at 200ms intervals until the async Google GSI script is initialized in window
    const interval = setInterval(() => {
      if (window.google?.accounts?.id && googleBtnContainerRef.current) {
        // Clear interval once script is detected
        clearInterval(interval);
        try {
          // Initialize Google accounts client with client_id and callback handler
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleCredentialResponse,
          });

          // Clear any previous container children
          googleBtnContainerRef.current.innerHTML = "";
          // Instruct Google to render its native button inside our container ref
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: "outline",
            size: "large",
            width: 380,
            text: "continue_with",
            shape: "pill",
          });
        } catch (e) {
          // Catch and log any initialization errors (e.g. invalid origin, CSP restrictions)
          console.warn("Failed to initialize Google GSI button:", e);
        }
      }
    }, 200);

    // Clean up timer on unmount
    return () => clearInterval(interval);
  }, [googleClientId]);

  /**
   * Handles user click on our custom button wrapper:
   * - If Google Client ID is configured, triggers Google One Tap prompt or clicks native button.
   * - If Google Client ID is missing, opens the local development simulation modal.
   */
  const handleCustomButtonClick = () => {
    if (googleClientId && window.google?.accounts?.id) {
      // Attempt to trigger the native Google button click inside the container
      const nativeBtn = googleBtnContainerRef.current?.querySelector("div[role=button]") as HTMLElement;
      if (nativeBtn) {
        nativeBtn.click();
        return;
      }
      // Fallback to displaying Google One Tap prompt overlay
      window.google.accounts.id.prompt();
    } else {
      // Development mode fallback: open the test simulation dialog
      setShowDemoModal(true);
    }
  };

  /**
   * Handles submission from the development simulation modal to authenticate with mock Google credentials.
   */
  const handleMockGoogleLogin = async (e: React.FormEvent) => {
    // Prevent default browser form refresh
    e.preventDefault();
    setLoading(true);
    try {
      // Send mock Google payload to backend
      const data = await googleLogin("", {
        email: demoEmail,
        name: demoName,
        picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${demoEmail}`,
      });
      // Close simulation modal
      setShowDemoModal(false);
      // Show success toast
      toastSuccess(`Signed in with Google as ${data?.user?.name}!`);
      // Navigate to dashboard
      navigate("/dashboard");
    } catch (err: any) {
      // Show failure toast
      toastError(err?.response?.data?.message || "Demo Google login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="w-full">
        {/* If Google Client ID is configured, this div serves as the mount point for Google's native GSI button */}
        {googleClientId ? (
          <div className="flex justify-center w-full" ref={googleBtnContainerRef} />
        ) : null}

        {/* Custom styled Google Button rendered when native GSI is waiting or unconfigured */}
        {(!googleClientId || !window.google?.accounts?.id) && (
          <button
            type="button"
            onClick={handleCustomButtonClick}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-zinc-800/80 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-sm border border-gray-300 dark:border-white/[0.1] rounded-2xl shadow-sm hover:shadow transition-all duration-200 active:scale-[0.99] cursor-pointer"
          >
            {/* Multi-colored Google "G" SVG icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              {/* Blue segment */}
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              {/* Green segment */}
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.43 7.37 24 12 24z"
              />
              {/* Yellow segment */}
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
              />
              {/* Red segment */}
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.29 2.57 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            {/* Button text or loading state */}
            <span>{loading ? "Connecting..." : text}</span>
          </button>
        )}
      </div>

      {/* ─── Development Simulation Modal ─── */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            {/* Modal header with Google Logo and title */}
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-white/5 pb-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.43 7.37 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.29 2.57 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-zinc-100 text-base">Google Sign-In</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Development Mode Simulation</p>
              </div>
            </div>

            {/* Explanation paragraph */}
            <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
              No <code className="bg-gray-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-emerald-500 font-mono">VITE_GOOGLE_CLIENT_ID</code> detected in <code className="font-mono">.env</code>. You can test instant Google authentication right now with this mock Google account, or configure your client ID in <code className="font-mono">.env</code>.
            </p>

            {/* Simulation test form */}
            <form onSubmit={handleMockGoogleLogin} className="space-y-3 pt-1">
              {/* Full name input */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-zinc-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={demoName}
                  onChange={(e) => setDemoName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Google email input */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-zinc-500 mb-1">Google Email</label>
                <input
                  type="email"
                  value={demoEmail}
                  onChange={(e) => setDemoEmail(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDemoModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-gray-600 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider text-black bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-all shadow-md active:scale-95"
                >
                  {loading ? "Signing in..." : "Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

