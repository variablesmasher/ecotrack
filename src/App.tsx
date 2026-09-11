/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { FilterProvider } from "./context/FilterContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/layout/Navbar";
import DashboardLayout from "./components/layout/DashboardLayout";

// Lazy-loaded pages for better performance and code splitting
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const CompanyProfilePage = lazy(() => import("./pages/dashboard/CompanyProfilePage"));
const DepartmentsPage = lazy(() => import("./pages/dashboard/DepartmentsPage"));
const CarbonLogsPage = lazy(() => import("./pages/dashboard/CarbonLogsPage"));
const AnalyticsPage = lazy(() => import("./pages/dashboard/AnalyticsPage"));
const ReportsPage = lazy(() => import("./pages/dashboard/ReportsPage"));
const UsersPage = lazy(() => import("./pages/dashboard/UsersPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

// Loading fallback for lazy-loaded pages
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center dark:bg-zinc-950 bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
          <div className="w-5 h-5 bg-emerald-500 rounded-full animate-pulse" />
        </div>
        <span className="text-sm dark:text-zinc-500 text-gray-500 font-medium">Loading...</span>
      </div>
    </div>
  );
}

// Error boundary to catch lazy-loading failures
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("EcoTrack ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center dark:bg-zinc-950 bg-gray-50 p-4">
          <div className="flex flex-col items-center text-center max-w-md">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold dark:text-zinc-100 text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm dark:text-zinc-400 text-gray-500 mb-6">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-2xl font-bold uppercase tracking-wide text-sm transition-all"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * ============================================================================
 * MEMBER 1: AUTHENTICATION & SECURITY
 * Client-Side Route Protection & Role-Based Access Control (RBAC) Guard
 * File: src/App.tsx
 * ============================================================================
 * 
 * Purpose:
 * 1. Authentication Check:
 *    - Verifies whether the client has an active authenticated session (JWT).
 *    - If unauthenticated, immediately redirects unauthorized guests to `/login`.
 * 
 * 2. Role-Based Access Control (RBAC):
 *    - Evaluates the user's role against the route's `allowedRoles` list.
 *    - If the user role (e.g. "employee") does not match permissions for a route
 *      (e.g. only ["admin"] allowed for `/departments` or `/company`), safely
 *      redirects them back to `/dashboard` without crashing.
 * 
 * 3. Loading State Management:
 *    - Waits until initial authentication re-hydration from `localStorage` completes
 *      (`isLoading === false`) to prevent premature login redirects on page refresh.
 */
function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  // The React component to render when authorized
  children: React.ReactNode; 
  // Optional array of authorized role identifiers (e.g. ["admin"], ["admin", "employee"])
  allowedRoles?: string[]; 
}) {
  // Extract auth state, active role, and re-hydration loading flag from Member 1 AuthContext
  const { isAuthenticated, role, isLoading } = useAuth();

  // If AuthContext is still reading localStorage, render nothing to avoid flash of login redirect
  if (isLoading) return null;

  // If the user has no valid session or token, redirect them to the Login page
  if (!isAuthenticated) return <Navigate to="/login" />;

  // If this route restricts access to specific roles and the user's role is not authorized:
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Gracefully redirect the user back to the main dashboard
    return <Navigate to="/dashboard" />;
  }

  // If all security checks pass, render the protected child component
  return <>{children}</>;
}

/**
 * Public Layout Wrapper:
 * Renders the global top navigation bar followed by nested public page content via <Outlet />.
 */
function PublicLayout() {
  return (
    <>
      {/* Top application navigation bar */}
      <Navbar />
      {/* Outlet renders the matched child route element (LandingPage, LoginPage, etc.) */}
      <Outlet />
    </>
  );
}

// Main application component containing all context providers and routing hierarchy
export default function App() {
  return (
    // ThemeProvider manages light/dark mode preference
    <ThemeProvider>
      {/* AuthProvider manages user session, JWT token, login, logout, and role */}
      <AuthProvider>
        {/* ToastProvider provides popup alert banners for errors and successes */}
        <ToastProvider>
          {/* FilterProvider provides date and department filters for dashboard analytics */}
          <FilterProvider>
            {/* HTML5 History API router */}
            <BrowserRouter>
              <div className="font-sans min-h-screen flex flex-col transition-colors duration-300 theme-root">
              {/* React Error Boundary catching any lazy-loading chunk errors */}
              <ErrorBoundary>
              {/* Suspense fallback rendering animated PageLoader during lazy chunk loading */}
              <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* ─── Member 1: Public Authentication & Landing Routes ──────────── */}
                <Route element={<PublicLayout />}>
                  {/* Public Landing Page */}
                  <Route path="/" element={<LandingPage />} />
                  {/* Member 1: Login Page with email/password and Google Sign-In */}
                  <Route path="/login" element={<LoginPage />} />
                  {/* Member 1: Register Page with complexity meter and Google Sign-In */}
                  <Route path="/register" element={<RegisterPage />} />
                  {/* Member 1: Forgot Password Page with Email OTP verification */}
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                </Route>
                
                {/* ─── Member 1: Protected Onboarding Flow ─────────────────────── */}
                <Route path="/onboarding" element={
                  <ProtectedRoute>
                    <OnboardingPage />
                  </ProtectedRoute>
                } />

                {/* ─── Protected Dashboard Layout (Requires Authentication) ─────── */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }>
                  {/* Main Overview Dashboard (Accessible to all authenticated roles) */}
                  <Route index element={<DashboardPage />} />
                  {/* User Profile & Account Settings (Accessible to all authenticated roles) */}
                  <Route path="profile" element={<ProfilePage />} />

                  {/* ─── RBAC Guard: Admin-Only Routes (Company Profile & Departments) ─── */}
                  {/* Company Profile Configuration (Restricted to role: "admin") */}
                  <Route path="company" element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <CompanyProfilePage />
                    </ProtectedRoute>
                  } />
                  {/* Department List & Management (Restricted to role: "admin") */}
                  <Route path="departments" element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <DepartmentsPage />
                    </ProtectedRoute>
                  } />
                  {/* Create New Department (Restricted to role: "admin") */}
                  <Route path="departments/add" element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <DepartmentsPage />
                    </ProtectedRoute>
                  } />
                  {/* Edit Department Details (Restricted to role: "admin") */}
                  <Route path="departments/:id/edit" element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <DepartmentsPage />
                    </ProtectedRoute>
                  } />

                  {/* ─── RBAC Guard: Operational Logging Routes ──────────────────── */}
                  {/* Carbon Logs View (Restricted to roles: "admin" and "employee") */}
                  <Route path="logs" element={
                    <ProtectedRoute allowedRoles={["admin", "employee"]}>
                      <CarbonLogsPage />
                    </ProtectedRoute>
                  } />
                  {/* Manual Carbon Log Entry (Restricted to roles: "admin" and "employee") */}
                  <Route path="logs/add" element={
                    <ProtectedRoute allowedRoles={["admin", "employee"]}>
                      <CarbonLogsPage />
                    </ProtectedRoute>
                  } />
                  {/* Bulk CSV / Invoice Upload (Restricted to roles: "admin" and "employee") */}
                  <Route path="logs/upload" element={
                    <ProtectedRoute allowedRoles={["admin", "employee"]}>
                      <CarbonLogsPage />
                    </ProtectedRoute>
                  } />
                  {/* Edit Carbon Log Entry (Restricted to roles: "admin" and "employee") */}
                  <Route path="logs/:id/edit" element={
                    <ProtectedRoute allowedRoles={["admin", "employee"]}>
                      <CarbonLogsPage />
                    </ProtectedRoute>
                  } />

                  {/* ─── RBAC Guard: Analytics & Executive Reports ───────────────── */}
                  {/* Advanced Analytics Page (Restricted to roles: "admin" and "executive") */}
                  <Route path="analytics" element={
                    <ProtectedRoute allowedRoles={["admin", "executive"]}>
                      <AnalyticsPage />
                    </ProtectedRoute>
                  } />
                  {/* Compliance & Sustainability Reports (Restricted to roles: "admin" and "executive") */}
                  <Route path="reports" element={
                    <ProtectedRoute allowedRoles={["admin", "executive"]}>
                      <ReportsPage />
                    </ProtectedRoute>
                  } />

                  {/* ─── RBAC Guard: User Management ─────────────────────────────── */}
                  {/* Team Members & Role Assignment (Restricted to role: "admin") */}
                  <Route path="users" element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <UsersPage />
                    </ProtectedRoute>
                  } />
                </Route>

                {/* ─── 404 Not Found Catch-All Route ───────────────────────────── */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>

              </Suspense>
              </ErrorBoundary>
              </div>
            </BrowserRouter>
          </FilterProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
