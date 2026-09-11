import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
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

export type Role = "admin" | "employee" | "executive";

interface AuthState {
  isAuthenticated: boolean;
  companyName: string | null;
  role: Role | null;
  userName: string | null;
  departmentId?: string | null;
  token: string | null;
  avatar?: string | null;
}

interface AuthContextType extends AuthState {
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  googleLogin: (credential: string, mockUser?: any) => Promise<any>;
  register: (data: { name: string; email: string; password: string; companyName: string; region: string }) => Promise<any>;
  logout: () => void;
}


const emptyState: AuthState = {
  isAuthenticated: false,
  companyName: null,
  role: null,
  userName: null,
  departmentId: null,
  token: null,
  avatar: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(emptyState);
  // True until we've checked localStorage for an existing session. ProtectedRoute waits on this
  // so it doesn't redirect to /login before a valid stored session has had a chance to load.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedAuth = localStorage.getItem("auth");
      if (storedAuth) {
        try {
          const parsed = JSON.parse(storedAuth);
          if (parsed.token) {
            // Validate session with backend. This is crucial because the backend uses an
            // in-memory DB that gets wiped on restart, making old JWTs point to non-existent data.
            const res = await apiClient.get("/auth/me");
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
          console.warn("Session validation failed, logging out.");
          localStorage.removeItem("auth");
          setAuth(emptyState);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const applyAuthResponse = (data: any) => {
    const newState: AuthState = {
      isAuthenticated: true,
      companyName: data.companyName,
      role: data.user.role,
      userName: data.user.name,
      departmentId: data.user.departmentId || null,
      token: data.token,
      avatar: data.user.avatar || null,
    };
    setAuth(newState);
    localStorage.setItem("auth", JSON.stringify(newState));
  };

  const login = async (email: string, password: string) => {
    const res = await apiClient.post("/auth/login", { email, password });
    applyAuthResponse(res.data);
    return res.data; // expose user info to the caller
  };

  const googleLogin = async (credential: string, mockUser?: any) => {
    const res = await apiClient.post("/auth/google", { credential, mockUser });
    applyAuthResponse(res.data);
    return res.data;
  };

  const register = async (data: { name: string; email: string; password: string; companyName: string; region: string }) => {
    const res = await apiClient.post("/auth/register", data);
    applyAuthResponse(res.data);
    return res.data; // expose user info to the caller
  };

  const logout = () => {
    setAuth(emptyState);
    localStorage.removeItem("auth");
  };

  return (
    <AuthContext.Provider value={{ ...auth, isLoading, login, googleLogin, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
