/**
 * ============================================================================
 * MEMBER 1: AUTHENTICATION & SECURITY
 * Server-Side Password Validator (server/utils/passwordValidator.ts)
 * ============================================================================
 * Enforces cryptographic complexity rules on incoming passwords during:
 * - User Registration (POST /api/auth/register)
 * - Password Resets (POST /api/auth/reset-password)
 * 
 * Rules:
 * 1. Minimum 8 characters
 * 2. At least one uppercase letter (A-Z)
 * 3. At least one lowercase letter (a-z)
 * 4. At least one numeric digit (0-9)
 * 5. At least one special symbol (!@#$%^&*...)
 */

// Interface defining the validation result returned by validateStrongPassword
export interface PasswordValidationResult {
  isValid: boolean;     // True only if ALL 5 complexity conditions are satisfied
  message?: string;    // Human-readable explanation of missing requirements
  details: {
    minLength: boolean;   // True if length >= 8
    hasUpper: boolean;    // True if contains [A-Z]
    hasLower: boolean;    // True if contains [a-z]
    hasNumber: boolean;   // True if contains [0-9]
    hasSpecial: boolean;  // True if contains non-alphanumeric symbol
  };
}

/**
 * validateStrongPassword:
 * Evaluates the given password against all 5 security criteria.
 */
export function validateStrongPassword(password: string): PasswordValidationResult {
  // 1. Evaluate each individual criterion using regular expressions
  const details = {
    // Check if password string length is 8 characters or more
    minLength: typeof password === "string" && password.length >= 8,
    // Check for presence of at least one uppercase letter
    hasUpper: /[A-Z]/.test(password || ""),
    // Check for presence of at least one lowercase letter
    hasLower: /[a-z]/.test(password || ""),
    // Check for presence of at least one numeric digit
    hasNumber: /[0-9]/.test(password || ""),
    // Check for presence of at least one non-alphanumeric special character
    hasSpecial: /[^A-Za-z0-9]/.test(password || ""),
  };

  // 2. Build a list of missing requirements to construct a descriptive error message
  const missing: string[] = [];
  if (!details.minLength) missing.push("at least 8 characters");
  if (!details.hasUpper) missing.push("an uppercase letter (A-Z)");
  if (!details.hasLower) missing.push("a lowercase letter (a-z)");
  if (!details.hasNumber) missing.push("a number (0-9)");
  if (!details.hasSpecial) missing.push("a special symbol (!@#$%^&*)");

  // 3. Password is valid only if zero requirements are missing
  const isValid = missing.length === 0;

  // 4. Return the structured validation result
  return {
    isValid,
    message: isValid ? undefined : `Password must contain ${missing.join(", ")}.`,
    details,
  };
}
