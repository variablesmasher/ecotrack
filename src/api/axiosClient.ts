/**
 * ============================================================================
 * MEMBER 1: AUTHENTICATION & SECURITY
 * HTTP Client: Axios Instance with Automatic JWT Interceptor
 * File: src/api/axiosClient.ts
 * ============================================================================
 * 
 * Purpose:
 * - Centralized Axios HTTP client configuration used across the entire frontend application.
 * - Sets the default baseURL prefix to `/api` (proxied in Vite or routed in production).
 * - Implements an outgoing request interceptor that reads the persisted JWT from `localStorage`
 *   and automatically injects the standard HTTP header:
 *       `Authorization: Bearer <jwt_token>`
 * - Ensures all backend API routes requiring authentication receive the credential seamlessly.
 */

// Import axios HTTP library
import axios from "axios";

/**
 * Instantiate configured Axios instance with application-wide defaults:
 * - baseURL: Prefix all relative requests with '/api' (e.g., apiClient.get('/auth/me') -> '/api/auth/me')
 * - headers: Set standard Content-Type to application/json
 */
const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Global Axios Request Interceptor:
 * Runs synchronously or asynchronously BEFORE every outgoing HTTP request is dispatched.
 */
apiClient.interceptors.request.use((config) => {
  // Retrieve serialized auth state saved by AuthContext during login/register
  const storedAuth = localStorage.getItem("auth");

  // Check if authentication session data is present in browser local storage
  if (storedAuth) {
    try {
      // Deserialize the stored JSON string containing user and token
      const { token } = JSON.parse(storedAuth);

      // If a valid JWT string exists, attach it as the Bearer token in the request headers
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // If localStorage contains corrupt or non-JSON data, catch the error gracefully
      // and allow the request to proceed without the header (will result in 401 if route is protected)
    }
  }

  // Return the configured request object to proceed with the HTTP call
  return config;
});

// Export the configured instance as the default export for use in components and hooks
export default apiClient;

