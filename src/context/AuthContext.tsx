// Import core React context and hook primitives
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
// Import configured Axios client with automatic Bearer token interceptor
import apiClient from "../api/axiosClient";

/**
 * ============================================================================
 * MEMBER 1: AUTHENTICATION & SECURITY
 * React Authentication Context (src/context/AuthContext.tsx)
 * ============================================================================
 * Responsibilities:
 * 1. Global Session State: Maintains isAuthenticated, role (RBAC), user details,
 *    company metadata, avatar, and JWT token across the entire React frontend.
 * 2. Real Auth Persistence: Safely stores JWT in localStorage and validates it
 *    on initial page mount via GET /api/auth/me against the backend database.
 * 3. Auth Actions: Provides login(), googleLogin(), register(), and logout()
 *    hooks to auth pages and navigation components.
 * 4. Synchronization: Injects Bearer token into all subsequent axios requests
 *    via axiosClient interceptor.
 */

// Supported user roles across the platform for Role-Based Access Control (RBAC)
export type Role = "admin" | "employee" | "executive";

// Interface representing the user's active authentication status and profile
interface AuthState {
  isAuthenticated: boolean;             // True if user has a verified, active JWT session
  companyName: string | null;           // Organization name associated with this user
  role: Role | null;                    // User's authorization role for RBAC checks
  userName: string | null;              // Full display name of the authenticated user
  departmentId?: string | null;         // Optional assigned department ID (for employees)
  token: string | null;                 // Active 7-day HMAC SHA-256 JSON Web Token
  avatar?: string | null;               // User's profile photo URL (e.g. from Google profile)
}

// Interface extending AuthState to include dispatch methods and loading status
interface AuthContextType extends AuthState {
  isLoading: boolean;                   // True while verifying stored localStorage session
  login: (email: string, password: string) => Promise<any>;                       // Email/password sign-in
  googleLogin: (credential: string, mockUser?: any) => Promise<any>;              // Google OAuth sign-in
  register: (data: { name: string; email: string; password: string; companyName: string; region: string }) => Promise<any>; // New company signup
  logout: () => void;                   // Clears local session and resets state
}

// Default unauthenticated baseline state
const emptyState: AuthState = {
  isAuthenticated: false,               // Unauthenticated by default
  companyName: null,
  role: null,
  userName: null,
  departmentId: null,
  token: null,
  avatar: null,
};

// Create the React Context object with undefined initial value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component:
 * Wraps the entire application to provide global access to authentication state.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Global auth state initialized to emptyState
  const [auth, setAuth] = useState<AuthState>(emptyState);

  // isLoading stays true until localStorage has been inspected and validated.
  // ProtectedRoute waits on this so it doesn't prematurely redirect to /login.
  const [isLoading, setIsLoading] = useState(true);

  // Initial session hydration effect: runs once when the app mounts
  useEffect(() => {
    const initAuth = async () => {
      // 1. Read stored session object from browser localStorage
      const storedAuth = localStorage.getItem("auth");

      if (storedAuth) {
        try {
          // 2. Parse the stored JSON string
          const parsed = JSON.parse(storedAuth);

          // 3. If a token exists, validate it against the backend GET /api/auth/me
          if (parsed.token) {
            // Sends request with Bearer token attached via axiosClient interceptor
            const res = await apiClient.get("/auth/me");

            // 4. Token is valid: update global state with fresh data from database
            setAuth({
              isAuthenticated: true,
              companyName: res.data.companyName,
              role: res.data.user.role,
              userName: res.data.user.name,
              departmentId: res.data.user.departmentId || null,
              token: parsed.token,
              avatar: res.data.user.avatar || null,
            });
          }
        } catch (error) {
          // 5. If verification fails (token expired or DB wiped), purge local cache
          console.warn("Session validation failed, logging out.");
          localStorage.removeItem("auth");
          setAuth(emptyState);
        }
      }

      // 6. Finished inspecting stored session: unblock route rendering
      setIsLoading(false);
    };

    // Execute session initialization
    initAuth();
  }, []);

  /**
   * applyAuthResponse:
   * Helper function to synchronize both React state and localStorage with new credentials.
   */
  const applyAuthResponse = (data: any) => {
    // 1. Construct the new authenticated state object
    const newState: AuthState = {
      isAuthenticated: true,
      companyName: data.companyName,
      role: data.user.role,
      userName: data.user.name,
      departmentId: data.user.departmentId || null,
      token: data.token,
      avatar: data.user.avatar || null,
    };

    // 2. Update React state
    setAuth(newState);

    // 3. Persist to browser localStorage for session survival across reloads
    localStorage.setItem("auth", JSON.stringify(newState));
  };

  /**
   * login:
   * Calls POST /api/auth/login with email and password credentials.
   */
  const login = async (email: string, password: string) => {
    // 1. Send authentication request to Express backend
    const res = await apiClient.post("/auth/login", { email, password });
    // 2. Apply session response
    applyAuthResponse(res.data);
    // 3. Return data to the caller for toast notifications or routing
    return res.data;
  };

  /**
   * googleLogin:
   * Calls POST /api/auth/google with Google ID token credential or mock test account.
   */
  const googleLogin = async (credential: string, mockUser?: any) => {
    // 1. Send Google credential to backend
    const res = await apiClient.post("/auth/google", { credential, mockUser });
    // 2. Apply verified session response
    applyAuthResponse(res.data);
    // 3. Return data to the caller
    return res.data;
  };

  /**
   * register:
   * Calls POST /api/auth/register to create organization and admin user.
   */
  const register = async (data: { name: string; email: string; password: string; companyName: string; region: string }) => {
    // 1. Send registration payload to backend
    const res = await apiClient.post("/auth/register", data);
    // 2. Apply resulting session response
    applyAuthResponse(res.data);
    // 3. Return data to the caller
    return res.data;
  };

  /**
   * logout:
   * Destroys current session and purges localStorage.
   */
  const logout = () => {
    // 1. Reset state to empty baseline
    setAuth(emptyState);
    // 2. Remove stored auth JSON from browser storage
    localStorage.removeItem("auth");
  };

  // Provide authentication state and dispatch actions to children components
  return (
    <AuthContext.Provider value={{ ...auth, isLoading, login, googleLogin, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth hook:
 * Custom hook allowing any component to access the authentication context.
 */
export function useAuth() {
  // Access React context
  const context = useContext(AuthContext);
  // Throw informative error if hook is called outside of AuthProvider hierarchy
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  // Return the context object
  return context;
}
