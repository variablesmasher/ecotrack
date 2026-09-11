# ECOTRACK — COMPLETE AUTHENTICATION & SECURITY GUIDE (VIVA & TECHNICAL REFERENCE)
**Document Name:** `FINALFILE.md`  
**Project:** EcoTrack — Sustainability Intelligence Platform  
**Member Focus:** Member 1 — Authentication, Security & Authorization  
**Target Repository:** `variablesmasher/ecotrack`  

---

# TABLE OF CONTENTS
1. [Executive Summary & High-Level Architecture](#1-executive-summary--high-level-architecture)
2. [Master File-by-File Reference (What Every File Does & Uses)](#2-master-file-by-file-reference)
   - [Backend Files (Server)](#backend-files-server)
   - [Frontend Files (Client)](#frontend-files-client)
3. [Deep-Dive Technical Concepts (Everything You Must Know for Viva)](#3-deep-dive-technical-concepts)
   - [3.1 Password Hashing with Bcrypt](#31-password-hashing-with-bcrypt)
   - [3.2 JSON Web Tokens (JWT) & Stateless Authentication](#32-json-web-tokens-jwt--stateless-authentication)
   - [3.3 Google OAuth 2.0 & Google Identity Services (GIS)](#33-google-oauth-20--google-identity-services-gis)
   - [3.4 Role-Based Access Control (RBAC)](#34-role-based-access-control-rbac)
   - [3.5 Multi-Step OTP Verification & MongoDB TTL Indexes](#35-multi-step-otp-verification--mongodb-ttl-indexes)
   - [3.6 NIST & OWASP Password Complexity Standards](#36-nist--owasp-password-complexity-standards)
   - [3.7 Axios Interceptors & Bearer Authentication Flow](#37-axios-interceptors--bearer-authentication-flow)
   - [3.8 Multi-Tenancy Architecture (Organization Scoping)](#38-multi-tenancy-architecture-organization-scoping)
   - [3.9 Email Dispatch via SMTP & Nodemailer](#39-email-dispatch-via-smtp--nodemailer)
4. [Step-by-Step Data Flow Walkthroughs](#4-step-by-step-data-flow-walkthroughs)
   - [Flow A: User Registration & Organization Setup](#flow-a-user-registration--organization-setup)
   - [Flow B: User Login & Session Token Issuance](#flow-b-user-login--session-token-issuance)
   - [Flow C: Google One-Tap / OAuth Sign-In](#flow-c-google-one-tap--oauth-sign-in)
   - [Flow D: Forgot Password with Email OTP & Reset Token](#flow-d-forgot-password-with-email-otp--reset-token)
   - [Flow E: Authenticated Protected API Request with RBAC](#flow-e-authenticated-protected-api-request-with-rbac)
5. [Top 25 Viva / Interview Questions & Master Answers](#5-top-25-viva--interview-questions--master-answers)

---

# 1. EXECUTIVE SUMMARY & HIGH-LEVEL ARCHITECTURE

The EcoTrack platform is an enterprise-grade multi-tenant sustainability platform that tracks corporate carbon emissions, departments, and ESG compliance.

**Member 1** is solely responsible for **Authentication & Security**:
- Replaces mock authentication with **real, cryptographically secure JWT authentication**.
- Secures user credentials using **Bcrypt with 10 salt rounds**.
- Integrates **Google Identity Services (GSI) OAuth 2.0** for single sign-on.
- Provides **account recovery via 6-digit numeric OTPs** sent through Nodemailer and auto-expired via MongoDB TTL indexes.
- Enforces **Role-Based Access Control (RBAC)** across three distinct organizational roles: `admin`, `employee`, and `executive`.
- Enforces enterprise password complexity standards across both client and server layers.

### System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 FRONTEND (React + Vite)                          |
|                                                                                   |
|  [RegisterPage]  [LoginPage]  [ForgotPasswordPage]  [PasswordStrengthMeter]       |
|         │             │               │                                           |
|         ▼             ▼               ▼                                           |
|  +─────────────────────────────────────────────────────────────+                  |
|  |                 AuthContext (React Context API)             |                  |
|  |   - token in localStorage ("auth")                           |                  |
|  |   - user, role, companyId state                             |                  |
|  |   - login(), register(), googleLogin(), logout()            |                  |
|  +──────────────────────────────┬──────────────────────────────+                  |
|                                 │                                                 |
|                                 ▼                                                 |
|  +─────────────────────────────────────────────────────────────+                  |
|  |                 apiClient (Axios Interceptor)               |                  |
|  |   - Injects: "Authorization: Bearer <jwt_token>"            |                  |
|  +──────────────────────────────┬──────────────────────────────+                  |
+─────────────────────────────────┼─────────────────────────────────────────────────+
                                  │ HTTP Requests (/api/...)
                                  ▼
+-----------------------------------------------------------------------------------+
|                             BACKEND (Node.js + Express)                           |
|                                                                                   |
|  [authRoutes.ts] ──────► [requireAuth.ts] (JWT verification)                     |
|         │                          │                                              |
|         ▼                          ▼                                              |
|  [authController.ts] ──► [requireRole.ts] (RBAC Guard: admin, employee, exec)     |
|   ├── register()                   │                                              |
|   ├── login()                      ▼                                              |
|   ├── googleLogin()      [Protected API Controllers]                              |
|   ├── forgotPassword()   (Carbon logs, Departments, Users, Reports)               |
|   ├── verifyOtp()                                                                 |
|   └── resetPassword()                                                             |
|         │                                                                         |
|         ├──────────────┬──────────────────┬─────────────────┐                     |
|         ▼              ▼                  ▼                 ▼                     |
|  [passwordValidator] [emailService]  [User Model]       [Otp Model]               |
|   (OWASP Regex)      (Nodemailer)    (MongoDB users)    (MongoDB TTL 10m)         |
+-----------------------------------------------------------------------------------+
```

---

# 2. MASTER FILE-BY-FILE REFERENCE

Every file owned or touched by Member 1 is cataloged below with its **role**, the **libraries/technologies used**, its **internal functions**, and **how it integrates** with other components.

---

## BACKEND FILES (Server)

### 1. `server/controllers/authController.ts`
- **Location:** `server/controllers/authController.ts`
- **Role:** The core backend brain for authentication. It processes incoming HTTP requests, performs cryptographic operations, queries the database, and returns JSON responses with JWTs.
- **Technologies & Libraries Used:**
  - `bcryptjs`: Secure password hashing and comparing.
  - `jsonwebtoken`: Signing and verifying 7-day session JWTs and 15-minute reset tokens.
  - `google-auth-library`: Verifying Google OAuth 2.0 ID tokens sent by GIS.
  - `User.ts` (Mongoose Model): Database operations on users.
  - `Otp.ts` (Mongoose Model): Storing and checking hashed one-time passwords.
  - `Company.ts` (Mongoose Model): Creating and retrieving organizations.
  - `passwordValidator.ts`: Enforcing password complexity rules.
  - `emailService.ts`: Sending OTP emails.
- **Key Functions & Logic:**
  - `signToken(payload)`: Helper that generates a signed JWT containing `{ id, role, companyId }` with a 7-day expiration.
  - `register(req, res)`:
    1. Validates required fields (`name`, `email`, `password`, `companyName`, `region`).
    2. Runs `validateStrongPassword(password)`. Returns HTTP 400 if complexity is not met.
    3. Normalizes email to lowercase and checks if user already exists (HTTP 409).
    4. Hashes the password using `bcrypt.hash(password, 10)`.
    5. Creates a new `Company` in MongoDB.
    6. Creates a new `User` with role `"admin"` and links to `company._id`.
    7. Signs a 7-day session JWT and returns HTTP 201 with `{ token, user }`.
  - `login(req, res)`:
    1. Normalizes email and finds user in MongoDB.
    2. Validates user existence (HTTP 401 if missing).
    3. Compares incoming plain password with stored bcrypt hash using `bcrypt.compare()`.
    4. Fetches company details.
    5. Signs and returns a 7-day JWT with HTTP 200.
  - `googleLogin(req, res)`:
    1. Accepts a Google ID token (`credential`) or mock payload (in dev mode).
    2. Verifies the token cryptographically via `googleAuthClient.verifyIdToken()`.
    3. Extracts Google profile (`email`, `name`, `picture`).
    4. If user exists: links `googleId` if needed, signs JWT, and logs user in.
    5. If new user: auto-provisions a new Company and Admin user, then signs JWT.
  - `forgotPassword(req, res)`:
    1. Checks if email exists in database.
    2. Generates a secure random 6-digit numeric OTP (`crypto.randomInt(100000, 999999)`).
    3. Hashes the OTP with `bcrypt` and stores it in the `otps` collection with a 10-minute TTL.
    4. Dispatches the OTP email via `sendOtpEmail()`.
  - `verifyOtp(req, res)`:
    1. Finds active OTP record in MongoDB.
    2. Checks attempt counter; if attempts >= 5, deletes OTP and locks out verification (brute-force defense).
    3. Compares user-entered OTP with stored hash via `bcrypt.compare()`.
    4. On success: deletes OTP and issues a signed, short-lived (15 minutes) `purpose: "password_reset"` JWT.
  - `resetPassword(req, res)`:
    1. Verifies the 15-minute reset token via `jwt.verify()`.
    2. Validates the new password against strong complexity rules.
    3. Hashes the new password with bcrypt and updates `user.password` in MongoDB.
  - `getMe(req, res)`:
    1. Re-hydrates user data using `req.user.id` set by `requireAuth` middleware.

---

### 2. `server/routes/authRoutes.ts`
- **Location:** `server/routes/authRoutes.ts`
- **Role:** Defines HTTP endpoints, methods, and links route URLs to the controller functions.
- **Technologies Used:** `express.Router()`, `requireAuth` middleware.
- **Endpoints Defined:**
  - `POST /api/auth/register` -> `authController.register`
  - `POST /api/auth/login` -> `authController.login`
  - `POST /api/auth/google` -> `authController.googleLogin`
  - `POST /api/auth/forgot-password` -> `authController.forgotPassword`
  - `POST /api/auth/verify-otp` -> `authController.verifyOtp`
  - `POST /api/auth/reset-password` -> `authController.resetPassword`
  - `GET  /api/auth/me` -> `requireAuth` middleware -> `authController.getMe`

---

### 3. `server/middleware/auth.ts`
- **Location:** `server/middleware/auth.ts`
- **Role:** Protects private API endpoints. Validates that incoming HTTP requests carry a valid, unexpired JSON Web Token.
- **Technologies Used:** `jsonwebtoken`, `express.Request`, `express.Response`, `User.ts`.
- **How It Works Line-by-Line:**
  1. Inspects the HTTP header: `req.headers.authorization`.
  2. Verifies format: must start with `"Bearer <token>"`. If missing, returns HTTP 401 Unauthorized.
  3. Extracts the raw token string by splitting the header: `authHeader.split(" ")[1]`.
  4. Calls `jwt.verify(token, process.env.JWT_SECRET)`. If expired or signature altered, throws error -> returns HTTP 401.
  5. Decodes payload `{ id, role, companyId }`.
  6. Fetches the user from MongoDB using `User.findById(decoded.id).select("-password")` (ensures deleted users cannot authenticate and excludes password hash).
  7. Attaches the user document to `req.user` and calls `next()` to pass control to the next handler.

---

### 4. `server/middleware/requireRole.ts`
- **Location:** `server/middleware/requireRole.ts`
- **Role:** Enforces Role-Based Access Control (RBAC) on protected endpoints.
- **Technologies Used:** Express middleware factory closure.
- **How It Works:**
  - Accepts an array of allowed roles: `requireRole(["admin", "executive"])`.
  - Checks if `req.user` exists (must be placed after `requireAuth`).
  - Checks if `allowedRoles.includes(req.user.role)`.
  - If allowed: calls `next()`.
  - If unauthorized: immediately returns HTTP 403 Forbidden: `{ message: "Access denied. Insufficient permissions." }`.

---

### 5. `server/models/User.ts`
- **Location:** `server/models/User.ts`
- **Role:** Mongoose schema and model defining how user accounts are stored in MongoDB.
- **Technologies Used:** `mongoose.Schema`, `mongoose.model`.
- **Key Schema Attributes:**
  - `name`: String, trimmed, required.
  - `email`: String, required, lowercase, unique index (prevents duplicate accounts).
  - `password`: String, required (stores the 60-character bcrypt hash).
  - `role`: String enum: `["admin", "employee", "executive"]`, default: `"employee"`.
  - `companyId`: Mongoose ObjectId referencing the `Company` collection.
  - `department`: String, optional department assignment.
  - `googleId`: String, optional Google OAuth user ID.
  - `avatar`: String URL for profile image.
  - `timestamps: true`: Automatically maintains `createdAt` and `updatedAt`.

---

### 6. `server/models/Otp.ts`
- **Location:** `server/models/Otp.ts`
- **Role:** Mongoose schema for temporary one-time password verification codes.
- **Technologies Used:** MongoDB TTL (Time-To-Live) index.
- **Key Schema Attributes:**
  - `email`: String, required.
  - `otp`: String, required (stores the bcrypt hash of the 6-digit code).
  - `attempts`: Number, default 0 (increments on failed attempts, max 5).
  - `createdAt`: Date, default `Date.now`, with index: `{ expires: 600 }`.
    > **Crucial Concept:** MongoDB's background TTL thread automatically purges documents after 600 seconds (10 minutes). No cron job or cleanup script required!

---

### 7. `server/utils/emailService.ts`
- **Location:** `server/utils/emailService.ts`
- **Role:** Dispatches professional HTML emails with OTP codes to users during password recovery.
- **Technologies Used:** `nodemailer`.
- **How It Works:**
  - If `SMTP_HOST` and `SMTP_USER` are configured in `.env`, creates a production Nodemailer transporter.
  - If not configured (local dev mode), automatically creates an **Ethereal test account** using `nodemailer.createTestAccount()`.
  - Generates a styled HTML email template featuring the EcoTrack green brand palette and the prominent 6-digit OTP.
  - In development mode, logs the preview URL in terminal: `Preview URL: https://ethereal.email/message/...`.

---

### 8. `server/utils/passwordValidator.ts`
- **Location:** `server/utils/passwordValidator.ts`
- **Role:** Backend authoritative password complexity validator implementing OWASP/NIST guidelines.
- **Rules Enforced:**
  1. Minimum 8 characters (`password.length >= 8`)
  2. At least one uppercase letter (`/[A-Z]/`)
  3. At least one lowercase letter (`/[a-z]/`)
  4. At least one digit (`/[0-9]/`)
  5. At least one special symbol (`/[^A-Za-z0-9]/`)
- **Return Type:** `{ isValid: boolean, message: string }`.

---

## FRONTEND FILES (Client)

### 9. `src/pages/auth/RegisterPage.tsx`
- **Location:** `src/pages/auth/RegisterPage.tsx`
- **Role:** Onboarding page where users create a new account and organization.
- **Technologies Used:** React hooks (`useState`, `useNavigate`), `lucide-react` icons, `AuthContext`, `PasswordStrengthMeter`, `GoogleSignInButton`, `ToastContext`.
- **Key Capabilities:**
  - Captures: Organization Name, Country (from `COUNTRIES` list), Full Name, Email, Password, Confirm Password.
  - Live password complexity evaluation on every keystroke.
  - Blocks form submission if password does not satisfy all 5 rules or passwords don't match.
  - Dispatches `register()` to `AuthContext` -> stores JWT in `localStorage` -> navigates to `/onboarding`.

---

### 10. `src/pages/auth/LoginPage.tsx`
- **Location:** `src/pages/auth/LoginPage.tsx`
- **Role:** Primary login interface for returning users.
- **Technologies Used:** React hooks, `AuthContext`, `GoogleSignInButton`, `ToastContext`.
- **Key Capabilities:**
  - Captures: Email and Password.
  - Password visibility toggle (Eye / EyeOff icon).
  - "Remember me" option.
  - Link to `/forgot-password`.
  - Dispatches `login()` to `AuthContext` -> stores JWT -> navigates to `/dashboard`.

---

### 11. `src/pages/auth/ForgotPasswordPage.tsx`
- **Location:** `src/pages/auth/ForgotPasswordPage.tsx`
- **Role:** 3-step interactive account recovery workflow.
- **State Machine Implementation:**
  - `STEP 1: "email"`: User submits email address -> triggers `POST /api/auth/forgot-password` -> moves to step 2.
  - `STEP 2: "otp"`: User enters 6-digit OTP into separate single-digit input boxes with auto-focus forwarding -> triggers `POST /api/auth/verify-otp` -> receives 15-minute reset token -> moves to step 3. Includes 60s resend timer.
  - `STEP 3: "new_password"`: User enters new password with live `PasswordStrengthMeter` -> triggers `POST /api/auth/reset-password` -> password updated in MongoDB -> navigates to `/login`.

---

### 12. `src/context/AuthContext.tsx`
- **Location:** `src/context/AuthContext.tsx`
- **Role:** Central React Context provider managing global authentication state across the entire frontend.
- **State Exposed:**
  - `user`: `{ id, name, email, role, companyId, avatar, department }`
  - `token`: String JWT
  - `role`: `"admin" | "employee" | "executive" | null`
  - `companyId`: String | null
  - `isAuthenticated`: Boolean
  - `isLoading`: Boolean (true while re-hydrating session on page load)
- **Key Methods:**
  - `login(email, password)`: Calls `apiClient.post("/auth/login")`, saves `{ token, user }` in `localStorage.setItem("auth")`, updates React state.
  - `register(formData)`: Calls `apiClient.post("/auth/register")`, saves token in `localStorage`, updates React state.
  - `googleLogin(credential, mockProfile)`: Calls `apiClient.post("/auth/google")`, saves token, updates React state.
  - `logout()`: Clears `localStorage.removeItem("auth")`, resets state to null, redirects to `/login`.
  - `useEffect()` (Re-hydration): On page reload, reads `localStorage`, calls `GET /api/auth/me` to ensure JWT is still valid, and syncs state.

---

### 13. `src/components/auth/PasswordStrengthMeter.tsx`
- **Location:** `src/components/auth/PasswordStrengthMeter.tsx`
- **Role:** Real-time visual feedback widget displayed under password inputs.
- **Visual Features:**
  - 4-segment reactive progress bar:
    - Score 1: Red ("Weak")
    - Score 2: Amber ("Fair")
    - Score 4: Emerald Green ("Strong")
  - 5-item checklist with check/cross icons:
    - 8+ characters
    - Uppercase letter (A-Z)
    - Lowercase letter (a-z)
    - Number (0-9)
    - Special symbol (!@#$)

---

### 14. `src/components/auth/GoogleSignInButton.tsx`
- **Location:** `src/components/auth/GoogleSignInButton.tsx`
- **Role:** Google Identity Services (GIS) client-side button with development fallback.
- **Key Features:**
  - Injects and renders Google's official GSI button when `VITE_GOOGLE_CLIENT_ID` is set.
  - Intercepts Google ID token in `handleCredentialResponse` and sends it to backend.
  - When `VITE_GOOGLE_CLIENT_ID` is missing (offline evaluation mode), opens a dev simulation modal allowing examiners to test instant Google login with a test profile without needing Google Cloud credentials!

---

### 15. `src/utils/passwordValidator.ts` (Frontend)
- **Location:** `src/utils/passwordValidator.ts`
- **Role:** Client-side password evaluator matching backend criteria.
- **Exports:**
  - `evaluatePassword(password: string): PasswordStrength`
  - Returns: `{ score, label, color, isStrong, criteria }`.

---

### 16. `src/api/axiosClient.ts`
- **Location:** `src/api/axiosClient.ts`
- **Role:** Central Axios instance with an automatic Bearer token interceptor.
- **Interceptor Logic:**
  - Reads `localStorage.getItem("auth")`.
  - If token exists, attaches `config.headers.Authorization = 'Bearer ' + token`.
  - Ensures every API request to `/api/...` is automatically authenticated without manual header injection in components.

---

### 17. `src/App.tsx` (Route Protection & RBAC)
- **Location:** `src/App.tsx`
- **Role:** Application root routing table featuring `ProtectedRoute`.
- **RBAC Route Guard Implementation:**
  ```tsx
  function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
    const { isAuthenticated, role, isLoading } = useAuth();
    if (isLoading) return null; // Avoid flash of redirect
    if (!isAuthenticated) return <Navigate to="/login" />;
    if (allowedRoles && role && !allowedRoles.includes(role)) {
      return <Navigate to="/dashboard" />; // RBAC redirection
    }
    return children;
  }
  ```
- **Role Route Map:**
  - `/departments`, `/company`, `/users` -> Allowed: `["admin"]`
  - `/logs`, `/logs/add`, `/logs/upload` -> Allowed: `["admin", "employee"]`
  - `/analytics`, `/reports` -> Allowed: `["admin", "executive"]`
  - `/dashboard`, `/profile` -> Allowed: All authenticated users

---

# 3. DEEP-DIVE TECHNICAL CONCEPTS
*(Memorize these explanations for your Viva / Oral Examination)*

---

## 3.1 PASSWORD HASHING WITH BCRYPT

### What is Hashing vs Encryption?
- **Encryption is two-way:** Plaintext is converted to ciphertext using a key, and ciphertext can be decrypted back to plaintext using the same key (symmetric) or a private key (asymmetric).
- **Hashing is strictly one-way:** Plaintext is passed through a mathematical hashing algorithm that produces a fixed-length string (digest). It is computationally infeasible to reverse a hash back to plaintext.

### Why not use MD5 or SHA-256?
- MD5 and SHA-256 are **fast general-purpose algorithms** designed for checksums and file integrity.
- Because modern GPUs can calculate **billions of SHA-256 hashes per second**, an attacker with a leaked database can brute-force passwords in minutes using precomputed dictionary attacks and **Rainbow Tables** (lookup tables of hashed passwords).

### How Bcrypt Solves This:
1. **Adaptive Work Factor (Salt Rounds):**
   - In EcoTrack, we use `bcrypt.hash(password, 10)` (10 rounds = $2^{10} = 1,024$ iterations).
   - As hardware gets faster, developers can increase rounds to 12 or 14 to deliberately slow down computation, making brute-force attacks economically and computationally impossible.
2. **Cryptographic Salting:**
   - A unique, cryptographically random string (salt) is generated for every single password before hashing.
   - Even if two users have the exact same password (`"Password@123"`), their resulting bcrypt hashes are completely different.
   - This completely neutralizes Rainbow Table attacks.
3. **Timing Attack Protection:**
   - `bcrypt.compare()` compares hashes in constant time, preventing attackers from deducing characters by measuring server response times.

### Structure of a Stored Bcrypt Hash
```
$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
├───┼──┼──────────────────────┼─────────────────────────────┤
 │   │            │                          │
 │   │            │                          └─ 31-char Hash (Result of 1024 rounds)
 │   │            └─ 22-char Base64 Salt
 │   └─ Cost Factor (10 rounds = 2^10 iterations)
 └─ Algorithm identifier ($2a$ = bcrypt)
```

---

## 3.2 JSON WEB TOKENS (JWT) & STATELESS AUTHENTICATION

### What is a JWT?
A JSON Web Token (RFC 7519) is a compact, URL-safe means of securely transmitting claims between two parties. In EcoTrack, it is used for **stateless session management**.

### Anatomy of a JWT:
A token consists of three parts separated by dots (`.`):
$$\text{Header} . \text{Payload} . \text{Signature}$$

1. **Header:** Identifies algorithm and token type.
   ```json
   { "alg": "HS256", "typ": "JWT" }
   ```
2. **Payload (Claims):** Carries application data.
   ```json
   {
     "id": "65f01a8b...",
     "role": "admin",
     "companyId": "65f019fc...",
     "iat": 1710192000,
     "exp": 1710796800
   }
   ```
3. **Signature:** Cryptographic seal that prevents tampering.
   $$\text{HMACSHA256}(\text{base64Url}(Header) + "." + \text{base64Url}(Payload), \text{JWT\_SECRET})$$

### Stateless vs Stateful Authentication:
| Feature | Stateful (Traditional Sessions) | Stateless (EcoTrack JWT) |
| :--- | :--- | :--- |
| **Where is session stored?** | Server RAM or Redis database | Client-side (`localStorage`) |
| **Database lookup on each request?** | **Yes** (must query session table) | **No** (signature verified in-memory using `JWT_SECRET`) |
| **Horizontal Scalability** | Difficult (requires sticky sessions or shared Redis) | Seamless (any backend instance with `JWT_SECRET` can verify) |
| **Server Memory Footprint** | Grows with active users | Zero memory cost per user |

### How JWT Verification Works:
1. Server receives token from `Authorization: Bearer <token>`.
2. Server splits token into Header, Payload, and Signature.
3. Server independently computes:
   $$\text{HMACSHA256}(\text{base64Url}(Header) + "." + \text{base64Url}(Payload), \text{JWT\_SECRET})$$
4. Server compares its newly computed signature with the token's attached signature:
   - If they match: the payload is guaranteed authentic and has not been tampered with.
   - If user changed their role from `"employee"` to `"admin"`, the signatures will not match -> rejected with HTTP 401.
5. Server verifies expiration: `exp > Date.now() / 1000`.

---

## 3.3 GOOGLE OAUTH 2.0 & GOOGLE IDENTITY SERVICES (GIS)

### How Google OAuth Works in EcoTrack:
1. **Frontend Trigger:** User clicks "Continue with Google".
2. **Google Identity Services (GSI):** Communicates with Google's OAuth 2.0 authorization server.
3. **Consent & Credential:** User approves access on Google's prompt. Google signs an **OpenID Connect (OIDC) ID Token** (a JWT signed with Google's private RSA key) and passes it back to the browser callback.
4. **Backend Verification:**
   - Frontend sends the credential string to `POST /api/auth/google`.
   - Backend uses `google-auth-library`'s `OAuth2Client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })`.
   - The library downloads Google's public JSON Web Key Sets (JWKS) and verifies Google's cryptographic signature.
   - Extracts verified user claims: `{ email, name, sub (googleId), picture }`.
5. **Account Linking or Provisioning:**
   - If user exists with that email: links `googleId` and returns session JWT.
   - If user does not exist: creates a new `Company` and a new `User` with role `"admin"`, then issues session JWT.

---

## 3.4 ROLE-BASED ACCESS CONTROL (RBAC)

### Principle of Least Privilege:
Users are granted only the minimum permissions necessary to perform their job functions.

### EcoTrack Role Matrix:
| Resource / Action | Admin | Employee | Executive |
| :--- | :---: | :---: | :---: |
| View Overview Dashboard | Yes | Yes | Yes |
| View / Edit Personal Profile | Yes | Yes | Yes |
| Enter Daily Carbon Emission Logs | Yes | Yes | No |
| Bulk CSV / Invoice Upload | Yes | Yes | No |
| View High-Level Analytics | Yes | No | Yes |
| Export Compliance ESG Reports | Yes | No | Yes |
| Manage Company Profile | Yes | No | No |
| Add / Edit / Delete Departments | Yes | No | No |
| Manage Team Users & Assign Roles | Yes | No | No |

### Dual-Layer RBAC Architecture:
- **Layer 1: Frontend Route Guard (`ProtectedRoute.tsx` in `App.tsx`)**
  - Provides a clean user experience by hiding and redirecting unauthorized routes (e.g. employee trying to visit `/departments` gets redirected to `/dashboard`).
  - *Viva Note:* Frontend protection is purely for UX and can be bypassed by opening developer tools or inspecting JavaScript.
- **Layer 2: Backend Middleware Guard (`requireRole.ts` on Express Routes)**
  - Authoritative security boundary. Even if a user crafts a direct `POST /api/departments` curl request, the Express middleware checks `req.user.role`. If not `"admin"`, it returns **HTTP 403 Forbidden**.

---

## 3.5 MULTI-STEP OTP VERIFICATION & MONGODB TTL INDEXES

### The Account Recovery Workflow:
1. **Cryptographically Secure OTP Generation:**
   - `crypto.randomInt(100000, 1000000)` produces an unbiased 6-digit integer between `100000` and `999999`.
2. **Hashed OTP Storage:**
   - We **never store raw OTPs** in the database. If the database were compromised, an attacker could read unexpired OTPs and reset passwords.
   - EcoTrack hashes the OTP with `bcrypt` before writing to MongoDB.
3. **Automatic Expiration with MongoDB TTL Index:**
   - The `Otp` schema has `{ createdAt: { type: Date, default: Date.now, expires: 600 } }`.
   - MongoDB creates a background TTL index that purges expired documents automatically after 10 minutes (600 seconds).
4. **Brute-Force Rate Limiting:**
   - Each failed OTP attempt increments the `attempts` counter in MongoDB.
   - If `attempts >= 5`, the OTP record is permanently destroyed and the user is locked out from further guesses.
5. **Short-Lived Reset Token:**
   - When OTP verification succeeds, the server issues a single-purpose JWT:
     ```json
     { "id": "user_id", "email": "user@email.com", "purpose": "password_reset", "exp": 900 }
     ```
   - Valid for **15 minutes** only and restricted to `POST /api/auth/reset-password`.

---

## 3.6 NIST & OWASP PASSWORD COMPLEXITY STANDARDS

EcoTrack implements modern NIST SP 800-63B and OWASP guidelines:
- Minimum length: **8 characters**
- Character variety: Uppercase `[A-Z]`, Lowercase `[a-z]`, Number `[0-9]`, Special `[^A-Za-z0-9]`
- Client-side visual feedback using `PasswordStrengthMeter`
- Authoritative server-side re-validation: `validateStrongPassword()` in `server/utils/passwordValidator.ts` rejects weak passwords with detailed corrective error messages before reaching bcrypt.

---

## 3.7 AXIOS INTERCEPTORS & BEARER AUTHENTICATION FLOW

### What is an Axios Interceptor?
An interceptor is middleware for outgoing HTTP requests or incoming HTTP responses in Axios.

### How EcoTrack Uses It:
```ts
// src/api/axiosClient.ts
apiClient.interceptors.request.use((config) => {
  const storedAuth = localStorage.getItem("auth");
  if (storedAuth) {
    const { token } = JSON.parse(storedAuth);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
```
- **Why this is critical:** Developers don't need to manually pass headers in every `fetch()` or `axios.get()` call across 50+ components. Every outgoing API request is automatically stamped with the user's JWT.

---

## 3.8 MULTI-TENANCY ARCHITECTURE (ORGANIZATION SCOPING)

### How Data Isolation is Maintained:
- EcoTrack is a **multi-tenant SaaS platform** where multiple companies share the same database.
- Every `User` document stores a `companyId` pointing to their organization's `Company` document.
- When an authenticated user makes a request, `requireAuth` sets `req.user.companyId`.
- Downstream controllers (departments, carbon logs, reports) scope every database query:
  ```ts
  const logs = await CarbonLog.find({ companyId: req.user.companyId });
  ```
- This guarantees that Company A can never view, edit, or leak emissions data belonging to Company B.

---

## 3.9 EMAIL DISPATCH VIA SMTP & NODEMAILER

- **Nodemailer** is the Node.js standard for dispatching emails via Simple Mail Transfer Protocol (SMTP).
- Configured with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` from `.env`.
- **Ethereal Email Sandbox:** When run locally without production SMTP credentials, `emailService.ts` automatically initializes an Ethereal virtual mailbox. When an OTP is requested, it logs a one-click viewing URL in the terminal so developers can preview and test OTPs instantly.

---

# 4. STEP-BY-STEP DATA FLOW WALKTHROUGHS

---

### Flow A: User Registration & Organization Setup
```
[User fills Register Form]
         │
         ▼
[PasswordStrengthMeter evaluates complexity locally]
         │
         ▼
[User clicks "Create Account"]
         │
         ▼
[Frontend: apiClient.post("/auth/register", formData)]
         │
         ▼
[Backend: server/controllers/authController.ts -> register()]
         │
         ├── 1. validateStrongPassword(password) -> HTTP 400 if invalid
         ├── 2. User.findOne({ email }) -> HTTP 409 if exists
         ├── 3. bcrypt.hash(password, 10) -> generates 60-char hash
         ├── 4. Company.create({ name, region }) -> creates organization
         ├── 5. User.create({ name, email, password: hash, role: "admin", companyId })
         ├── 6. signToken({ id, role, companyId }) -> generates 7-day JWT
         │
         ▼
[Backend returns HTTP 201: { token, user: { id, name, email, role, companyId } }]
         │
         ▼
[Frontend: AuthContext saves { token, user } in localStorage("auth")]
         │
         ▼
[Frontend: navigate("/onboarding")]
```

---

### Flow B: User Login & Session Token Issuance
```
[User enters Email & Password on LoginPage]
         │
         ▼
[Frontend: apiClient.post("/auth/login", { email, password })]
         │
         ▼
[Backend: authController.ts -> login()]
         │
         ├── 1. User.findOne({ email: email.toLowerCase() }) -> 401 if missing
         ├── 2. bcrypt.compare(password, user.password) -> 401 if mismatch
         ├── 3. Company.findById(user.companyId) -> fetches organization details
         ├── 4. signToken({ id, role: user.role, companyId: user.companyId })
         │
         ▼
[Backend returns HTTP 200: { token, user }]
         │
         ▼
[Frontend: AuthContext stores session & updates React state]
         │
         ▼
[Frontend: navigate("/dashboard")]
```

---

### Flow C: Google One-Tap / OAuth Sign-In
```
[User clicks "Continue with Google"]
         │
         ▼
[Google GSI Script loads Google Account Selector Prompt]
         │
         ▼
[User selects Google Account -> Google returns signed ID Token (credential)]
         │
         ▼
[Frontend: apiClient.post("/auth/google", { credential })]
         │
         ▼
[Backend: authController.ts -> googleLogin()]
         │
         ├── 1. googleAuthClient.verifyIdToken({ idToken, audience: CLIENT_ID })
         ├── 2. Extracts verified email, name, googleId
         ├── 3. User.findOne({ email })
         │        ├── IF EXISTS: link googleId -> issue JWT
         │        └── IF NEW: create Company -> create Admin User -> issue JWT
         │
         ▼
[Backend returns HTTP 200: { token, user }] -> [Navigate to /dashboard]
```

---

### Flow D: Forgot Password with Email OTP & Reset Token
```
1. REQUEST OTP:
   [User enters email] ──► POST /api/auth/forgot-password
                                 │
                                 ├── crypto.randomInt(100000, 999999) -> "849201"
                                 ├── bcrypt.hash("849201", 10)
                                 ├── Otp.create({ email, otp: hash, createdAt: now }) [TTL 10m]
                                 └── sendOtpEmail(email, "849201")
                                 
2. VERIFY OTP:
   [User enters 6 digits] ──► POST /api/auth/verify-otp { email, otp: "849201" }
                                 │
                                 ├── Find active OTP in MongoDB
                                 ├── If attempts >= 5 -> delete OTP & return 429 Locked
                                 ├── bcrypt.compare("849201", storedHash)
                                 ├── On Match: Otp.deleteOne()
                                 └── Sign 15-min JWT: { id, email, purpose: "password_reset" }
                                 
3. RESET PASSWORD:
   [User enters new pass] ──► POST /api/auth/reset-password { token, password }
                                 │
                                 ├── jwt.verify(token) -> check purpose === "password_reset"
                                 ├── validateStrongPassword(password)
                                 ├── bcrypt.hash(newPassword, 10)
                                 └── User.findByIdAndUpdate(id, { password: newHash })
```

---

### Flow E: Authenticated Protected API Request with RBAC
```
[Client wants to delete a Department: DELETE /api/departments/123]
         │
         ▼
[Axios Interceptor attaches: "Authorization: Bearer eyJhbGciOi..."]
         │
         ▼
[Express Server receives request]
         │
         ▼
[Middleware 1: requireAuth (server/middleware/auth.ts)]
   ├── Reads Authorization header
   ├── jwt.verify(token, JWT_SECRET) -> decodes payload { id, role, companyId }
   ├── User.findById(id).select("-password")
   ├── Attaches user to req.user
   └── Calls next()
         │
         ▼
[Middleware 2: requireRole(["admin"]) (server/middleware/requireRole.ts)]
   ├── Checks req.user.role
   ├── IF role === "employee": RETURNS HTTP 403 Forbidden! (Request terminated)
   └── IF role === "admin": Calls next()
         │
         ▼
[Controller: departmentController.deleteDepartment()]
   ├── Runs query: Department.findOneAndDelete({ _id: "123", companyId: req.user.companyId })
   └── Returns HTTP 200 Success
```

---

# 5. TOP 25 VIVA / INTERVIEW QUESTIONS & MASTER ANSWERS

### Q1: What is the difference between Authentication and Authorization?
> **Answer:**
> - **Authentication (AuthN)** verifies **who you are** (e.g. validating your email and password or Google OAuth ID token).
> - **Authorization (AuthZ)** determines **what you are allowed to do** (e.g. verifying via Role-Based Access Control whether an authenticated user has the `admin` role required to delete a department).

### Q2: Why did you choose Bcrypt over MD5 or SHA-256 for password storage?
> **Answer:**
> MD5 and SHA-256 are fast general-purpose hash algorithms designed for data integrity. Modern hardware can calculate billions of SHA-256 hashes per second, making them vulnerable to Rainbow Table and brute-force attacks. Bcrypt incorporates an adaptive work factor (salt rounds) that intentionally slows down computation, and automatically generates a unique cryptographic salt for every password so identical passwords produce completely different hashes.

### Q3: What is a Salt in hashing, and what attack does it prevent?
> **Answer:**
> A salt is a cryptographically random sequence of bytes added to the password input before hashing. It prevents **Rainbow Table attacks** (precomputed tables of password hashes). Because every salt is unique, attackers cannot use precomputed tables to crack hashes in bulk.

### Q4: Explain the structure of a JSON Web Token (JWT).
> **Answer:**
> A JWT consists of three Base64Url-encoded parts separated by periods:
> 1. **Header:** Contains the algorithm (`HS256`) and token type (`JWT`).
> 2. **Payload:** Contains claims such as user ID, role, company ID, and expiration timestamp (`exp`).
> 3. **Signature:** Formed by hashing the encoded header and payload using a secret key: `HMACSHA256(Header + "." + Payload, SECRET)`.

### Q5: Is a JWT encrypted? Can anyone read the payload?
> **Answer:**
> In standard JWTs (like ours using HMAC-SHA256), the token is **digitally signed, not encrypted**. The payload is merely Base64Url-encoded, meaning anyone who intercepts the token can decode and read the claims. However, they **cannot alter** any data in the payload because doing so invalidates the cryptographic signature. Sensitive secrets like raw passwords should never be placed in a JWT payload.

### Q6: What happens if an attacker modifies the role from "employee" to "admin" in a JWT?
> **Answer:**
> When the modified token arrives at the server, `jwt.verify()` takes the modified Header and Payload and re-computes the HMAC-SHA256 signature using the server's private `JWT_SECRET`. The computed signature will not match the attacker's signature. The server immediately throws a `JsonWebTokenError` and rejects the request with **HTTP 401 Unauthorized**.

### Q7: What are the advantages of stateless JWT authentication over traditional server sessions?
> **Answer:**
> With traditional sessions, the server must store session IDs in memory (RAM) or a database (like Redis) and query it on every single HTTP request. With stateless JWTs, the server does not store session state; it cryptographically verifies the token in-memory using `JWT_SECRET`. This makes the backend horizontally scalable and eliminates session database bottlenecks.

### Q8: What are the security risks of storing a JWT in `localStorage`, and how do you mitigate them?
> **Answer:**
> Tokens in `localStorage` are accessible to JavaScript running on the same domain, making them vulnerable to **Cross-Site Scripting (XSS)** attacks. Mitigations include:
> 1. Strict input sanitization and React's built-in JSX escaping.
> 2. Content Security Policy (CSP) headers.
> 3. Setting short token expiration times (7 days for session, 15 minutes for reset).
> 4. In high-security banking apps, storing tokens in `httpOnly`, `Secure`, `SameSite` cookies which JavaScript cannot read.

### Q9: How does Google Sign-In work from frontend to backend?
> **Answer:**
> The frontend loads Google Identity Services (GIS). When the user signs in, Google returns a cryptographically signed OpenID Connect ID Token. The frontend posts this token to `/api/auth/google`. The backend uses Google's official `google-auth-library` (`OAuth2Client.verifyIdToken`) to verify Google's signature against Google's public certificates. Once verified, the backend extracts the user's Google ID, email, and name, finds or creates the user in MongoDB, and issues our own EcoTrack JWT session token.

### Q10: Why do you verify the Google token on the backend instead of just trusting the frontend?
> **Answer:**
> Because the client is completely under the user's control. A malicious user could send a fake request with another person's email address (`ceo@company.com`). By requiring the raw Google ID Token and verifying it cryptographically on the backend using Google's public keys, we mathematically prove that Google authenticated that specific user.

### Q11: What is MongoDB TTL, and how is it used in the OTP system?
> **Answer:**
> TTL stands for **Time-To-Live**. MongoDB allows setting an expiration index on a Date field: `{ createdAt: 1 }, { expireAfterSeconds: 600 }`. MongoDB runs a background thread that periodically monitors documents and automatically deletes any OTP document older than 10 minutes (600 seconds). This ensures expired OTPs do not linger in the database without needing custom cron jobs.

### Q12: Why do you hash the OTP before storing it in MongoDB?
> **Answer:**
> Storing raw OTPs in the database is a security vulnerability. If an attacker gains read access to the database (through SQL/NoSQL injection or database dump theft), they could view valid OTPs and hijack user accounts within their 10-minute window. By hashing the OTP with `bcrypt`, even a database compromise does not reveal the actual 6-digit code.

### Q13: How do you prevent brute-force attacks on the 6-digit OTP?
> **Answer:**
> A 6-digit numeric OTP has only $1,000,000$ possible combinations ($10^6$), which an automated script could guess quickly without protection. We mitigate this by:
> 1. Enforcing a short 10-minute expiration window.
> 2. Tracking failed attempts in the OTP document (`attempts` field). If the user inputs 5 wrong OTPs, the OTP is deleted immediately and locked out.

### Q14: What is an Axios Interceptor and why is it used in this project?
> **Answer:**
> An Axios interceptor is a function that inspects or transforms outgoing HTTP requests before they are sent, or incoming responses before they are handled by `.then()`. In `src/api/axiosClient.ts`, our request interceptor reads the JWT from `localStorage` and automatically attaches `Authorization: Bearer <token>` to every outgoing API call. This eliminates the need to manually attach authentication headers in dozens of separate frontend API calls.

### Q15: What is Role-Based Access Control (RBAC), and what roles exist in EcoTrack?
> **Answer:**
> RBAC is an authorization model where system access permissions are tied to predefined organizational roles rather than individual users. EcoTrack implements three roles:
> 1. `admin`: Full administrative control over company profile, department management, team members, emissions logging, and executive reports.
> 2. `employee`: Can input daily carbon emissions logs, upload CSV invoices, and view personal/team logs.
> 3. `executive`: Read-only access to high-level ESG compliance dashboards, carbon analytics, and report generation.

### Q16: Why is client-side route protection (e.g. `ProtectedRoute`) not enough for security?
> **Answer:**
> Client-side code runs in the user's browser. An attacker can modify JavaScript in the browser console, alter React state, or use tools like Postman/cURL to make direct HTTP requests, bypassing `ProtectedRoute` completely. Real security **must** be enforced on the server using Express middleware (`requireAuth` and `requireRole`), where every protected route checks the signature of the JWT and the user's role before executing database operations.

### Q17: What HTTP status codes are used across your authentication system, and what does each mean?
> **Answer:**
> - `200 OK`: Successful login, OTP verification, or password reset.
> - `201 Created`: Successful user and organization registration.
> - `400 Bad Request`: Missing required fields or password failing complexity rules.
> - `401 Unauthorized`: Missing, invalid, or expired JWT token, or invalid login credentials.
> - `403 Forbidden`: Authenticated user lacks the required role (RBAC denial).
> - `404 Not Found`: User or resource not found.
> - `409 Conflict`: Attempting to register an email that already exists.
> - `429 Too Many Requests`: Exceeded 5 failed OTP attempts (rate limit lockout).
> - `500 Internal Server Error`: Server or database failure.

### Q18: How is Multi-Tenancy achieved in the database schema?
> **Answer:**
> Multi-tenancy is achieved through logical database partitioning using foreign key references. Every `User`, `Department`, and `CarbonLog` document contains a `companyId` referencing the tenant's `Company` document. When queries are executed in backend controllers, they are always scoped by `req.user.companyId` extracted from the verified JWT:
> ```ts
> CarbonLog.find({ companyId: req.user.companyId });
> ```
> This prevents cross-tenant data leakage.

### Q19: What password complexity rules do you enforce, and why?
> **Answer:**
> We enforce NIST/OWASP standards:
> 1. At least 8 characters (resists brute force).
> 2. At least one uppercase letter `[A-Z]`.
> 3. At least one lowercase letter `[a-z]`.
> 4. At least one digit `[0-9]`.
> 5. At least one special symbol `[^A-Za-z0-9]`.
> This guarantees sufficient entropy to prevent dictionary and credential stuffing attacks.

### Q20: What is the purpose of the 15-minute reset token in the Forgot Password flow?
> **Answer:**
> Once a user correctly verifies their 6-digit OTP, we do not want to keep the OTP active. We delete the OTP and issue a signed, short-lived (15-minute) JWT with claim `purpose: "password_reset"`. When the user submits their new password, the server validates this reset token. This guarantees that only a user who successfully solved the OTP within the last 15 minutes can reset the password.

### Q21: What is Nodemailer and Ethereal Email?
> **Answer:**
> Nodemailer is a Node.js library for sending emails via SMTP. Ethereal Email is a fake/sandbox SMTP service provided by Nodemailer for development. When EcoTrack runs locally without production SMTP credentials (like SendGrid or AWS SES), it generates an Ethereal test account and outputs a preview URL in the console where the examiner can view the formatted HTML email and copy the OTP.

### Q22: What happens when a user reloads the browser page in React?
> **Answer:**
> In a single-page React app, page reload clears all React component state in memory. However, our `AuthContext` reads the serialized session from `localStorage.getItem("auth")`. It immediately sets `isLoading = true`, fires `GET /api/auth/me` with the saved token to verify it against the server, re-populates user and role state, and then sets `isLoading = false`.

### Q23: Why do we exclude the password hash when fetching user profile via `User.findById().select("-password")`?
> **Answer:**
> The principle of defense in depth: the password hash is sensitive cryptographic material. It is only needed when verifying a login attempt in `bcrypt.compare()`. For all other operations (like `/api/auth/me` or logging user details), excluding it prevents accidental leakage into API responses, client logs, or analytics tools.

### Q24: What is CORS, and how is it handled in EcoTrack?
> **Answer:**
> **CORS (Cross-Origin Resource Sharing)** is a browser security mechanism that restricts web pages from making AJAX requests to a different domain, port, or protocol. In development, Vite runs on `http://localhost:5173` or `3000` while Express runs on port `3000`. We handle this via Vite's reverse proxy in `vite.config.ts` which proxies `/api` calls directly to the Express server, preventing CORS preflight issues.

### Q25: If you had more time, what additional security enhancements would you add?
> **Answer:**
> 1. **Refresh Tokens:** Use short-lived access tokens (15 minutes) paired with `httpOnly` refresh tokens (30 days) with token rotation.
> 2. **Two-Factor Authentication (2FA/TOTP):** Integration with Google Authenticator or Microsoft Authenticator using `speakeasy` and QR codes.
> 3. **IP-based Rate Limiting:** Using `express-rate-limit` to prevent DDoS and brute-force attacks on the `/login` endpoint.
> 4. **Audit Logging:** An immutable security event log tracking every login attempt, role elevation, and password change.

---

# 6. QUICK CHEAT-SHEET SUMMARY FOR ORAL DEFENSE

| Concept | What EcoTrack Uses | Why / Purpose |
| :--- | :--- | :--- |
| **Password Storage** | `bcryptjs` (10 rounds) | Adaptive, salted, slow one-way hashing |
| **Session Format** | JSON Web Token (`jsonwebtoken`) | Stateless, portable, signed with `JWT_SECRET` |
| **Token Expiry** | 7 days (session), 15 min (reset) | Limits window of opportunity if token stolen |
| **Token Header** | `Authorization: Bearer <token>` | Standard HTTP RFC 6750 authorization header |
| **Client Storage** | `localStorage.getItem("auth")` | Persists session across browser tab reloads |
| **Request Interceptor**| `axios.interceptors.request` | Injects JWT Bearer token into all API calls |
| **OAuth 2.0 Provider** | Google Identity Services (GIS) | Single sign-on using verified Google ID token |
| **Google Verification**| `google-auth-library` (`OAuth2Client`) | Cryptographically verifies Google's RSA signature |
| **OTP Generation** | `crypto.randomInt(100000, 999999)` | Unbiased 6-digit cryptographic integer |
| **OTP Expiration** | MongoDB TTL Index (`expires: 600`) | Purges records automatically after 10 minutes |
| **OTP Brute-Force** | Max 5 attempt counter in Mongo | Locks out attacker after 5 failed guesses |
| **Email Delivery** | `nodemailer` + Ethereal fallback | HTML email with EcoTrack branding |
| **Complexity Standard**| NIST / OWASP 5 criteria regex | Enforces 8+ chars, upper, lower, number, symbol |
| **Frontend RBAC** | `ProtectedRoute.tsx` in `App.tsx` | UI redirection based on `allowedRoles` |
| **Backend RBAC** | `requireRole.ts` middleware | Authoritative HTTP 403 Forbidden enforcement |

---
*End of Technical Reference — EcoTrack Member 1 (Authentication & Security)*
