/**
 * ============================================================================
 * MEMBER 1: AUTHENTICATION & SECURITY
 * Client-Side Password Strength & Complexity Evaluator
 * File: src/utils/passwordValidator.ts
 * ============================================================================
 * 
 * Purpose:
 * - Provides real-time client-side password security analysis as users type.
 * - Computes a 0 to 4 strength score, color indicators, text labels, and boolean
 *   criteria checks (length, uppercase, lowercase, numbers, special characters).
 * - Matches the backend server validation rules (server/utils/passwordValidator.ts)
 *   so users experience zero surprises when submitting their registration forms.
 */

// Interface defining the individual security criteria flags
export interface PasswordCriteria {
  // True if the password meets the minimum length requirement (>= 8 characters)
  minLength: boolean;
  // True if the password contains at least one uppercase letter (A-Z)
  hasUpper: boolean;
  // True if the password contains at least one lowercase letter (a-z)
  hasLower: boolean;
  // True if the password contains at least one numerical digit (0-9)
  hasNumber: boolean;
  // True if the password contains at least one special non-alphanumeric character (!@#$...)
  hasSpecial: boolean;
}

// Interface defining the overall password strength evaluation result
export interface PasswordStrength {
  // Numerical score between 0 (very weak / empty) and 4 (strongest)
  score: number;
  // Descriptive human-readable label for UI badges
  label: "Too Weak" | "Weak" | "Fair" | "Strong";
  // Tailwind CSS text color class matching the score
  color: string;
  // True if and only if all 5 criteria are satisfied
  isStrong: boolean;
  // Granular breakdown of which individual rules passed or failed
  criteria: PasswordCriteria;
}

/**
 * Evaluates the strength of a given password string against standard NIST/OWASP complexity guidelines.
 * 
 * @param password - The raw password string typed by the user.
 * @returns PasswordStrength object with score, badge label, color, and checklist criteria.
 */
export function evaluatePassword(password: string): PasswordStrength {
  // Guard against null or undefined inputs by defaulting to empty string
  const p = password || "";

  // Evaluate each individual requirement using targeted regular expressions:
  const criteria: PasswordCriteria = {
    // Check 1: Length must be at least 8 characters
    minLength: p.length >= 8,
    // Check 2: Must contain an uppercase letter [A-Z]
    hasUpper: /[A-Z]/.test(p),
    // Check 3: Must contain a lowercase letter [a-z]
    hasLower: /[a-z]/.test(p),
    // Check 4: Must contain a numeric digit [0-9]
    hasNumber: /[0-9]/.test(p),
    // Check 5: Must contain any non-alphanumeric character (symbols, punctuation)
    hasSpecial: /[^A-Za-z0-9]/.test(p),
  };

  // Count how many of the 5 criteria are currently met
  let satisfiedCount = 0;
  if (criteria.minLength) satisfiedCount++;
  if (criteria.hasUpper) satisfiedCount++;
  if (criteria.hasLower) satisfiedCount++;
  if (criteria.hasNumber) satisfiedCount++;
  if (criteria.hasSpecial) satisfiedCount++;

  // Initialize evaluation variables with baseline defaults
  let score = 0;
  let label: "Too Weak" | "Weak" | "Fair" | "Strong" = "Too Weak";
  let color = "text-red-500";

  // Tiered scoring logic:
  if (!p) {
    // Case 0: Empty password input
    score = 0;
    label = "Too Weak";
    color = "text-zinc-500";
  } else if (satisfiedCount < 3) {
    // Case 1: Satisfied fewer than 3 rules (e.g. only lowercase letters)
    score = 1;
    label = "Weak";
    color = "text-red-500";
  } else if (satisfiedCount < 5) {
    // Case 2: Satisfied 3 or 4 rules (moderate security, but missing one requirement)
    score = 2;
    label = "Fair";
    color = "text-amber-500";
  } else {
    // Case 3: All 5 rules satisfied (meets enterprise strong password standard)
    score = 4;
    label = "Strong";
    color = "text-emerald-500";
  }

  // Return the compiled evaluation summary
  return {
    score,
    label,
    color,
    // isStrong is strictly true only when all 5 requirements are satisfied
    isStrong: satisfiedCount === 5,
    criteria,
  };
}

