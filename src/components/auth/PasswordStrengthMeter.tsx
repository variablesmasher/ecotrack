/**
 * ============================================================================
 * MEMBER 1: AUTHENTICATION & SECURITY
 * UI Component: Password Strength Meter & Interactive Requirement Checklist
 * File: src/components/auth/PasswordStrengthMeter.tsx
 * ============================================================================
 * 
 * Purpose:
 * - Visual feedback widget displayed below password inputs on Register/Reset pages.
 * - Renders a 4-segment reactive progress bar showing real-time strength tiers:
 *     * Score 1: Red ("Weak")
 *     * Score 2: Amber ("Fair")
 *     * Score 4: Emerald Green ("Strong")
 * - Renders an interactive checklist with check/cross icons for all 5 security rules.
 */

// Import React library for JSX element rendering
import React from "react";
// Import Checkmark and Cross icons from lucide-react icon set
import { Check, X } from "lucide-react";
// Import the client-side password strength evaluation utility
import { evaluatePassword } from "../../utils/passwordValidator";

// Interface for component props
interface Props {
  // The raw password string being typed by the user in the parent form
  password: string;
  // Optional flag: whether to display the 5-rule criteria checklist below the bar (default: true)
  showChecklist?: boolean;
}

// Export the PasswordStrengthMeter functional component
export const PasswordStrengthMeter: React.FC<Props> = ({ password, showChecklist = true }) => {
  // Evaluate the password strength, score, and criteria against the rules
  const strength = evaluatePassword(password);

  // If the user hasn't typed anything yet, don't display anything to keep UI clean
  if (!password) return null;

  // Helper function: Determines the Tailwind background color for a given segment (1 through 4)
  const getSegmentColor = (index: number) => {
    // If this segment is higher than the achieved strength score, keep it muted/gray
    if (index > strength.score) return "bg-gray-200 dark:bg-zinc-800";
    // If the score is 1 (Weak), fill active segments with red
    if (strength.score === 1) return "bg-red-500";
    // If the score is 2 (Fair), fill active segments with amber/orange
    if (strength.score === 2) return "bg-amber-500";
    // If the score is 3 or 4 (Strong), fill active segments with emerald green
    return "bg-emerald-500";
  };

  // Define the criteria checklist items mapped to the evaluator flags
  const checklistItems = [
    { label: "8+ characters", met: strength.criteria.minLength },
    { label: "Uppercase letter (A-Z)", met: strength.criteria.hasUpper },
    { label: "Lowercase letter (a-z)", met: strength.criteria.hasLower },
    { label: "Number (0-9)", met: strength.criteria.hasNumber },
    { label: "Special symbol (!@#$)", met: strength.criteria.hasSpecial },
  ];

  return (
    // Outer container with top margin and vertical spacing
    <div className="mt-2 space-y-2.5">
      {/* ─── Segmented Strength Progress Bar ─── */}
      <div className="space-y-1">
        {/* Label header displaying "Password Strength:" and the current strength badge */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500 dark:text-zinc-500 font-medium">Password Strength:</span>
          {/* Dynamically styled label (e.g., text-red-500, text-emerald-500) */}
          <span className={`font-semibold ${strength.color}`}>{strength.label}</span>
        </div>

        {/* 4-bar horizontal grid representing the score visually */}
        <div className="grid grid-cols-4 gap-1.5 h-1.5">
          {/* Segment 1 */}
          <div className={`h-full rounded-full transition-colors duration-300 ${getSegmentColor(1)}`} />
          {/* Segment 2 */}
          <div className={`h-full rounded-full transition-colors duration-300 ${getSegmentColor(2)}`} />
          {/* Segment 3 */}
          <div className={`h-full rounded-full transition-colors duration-300 ${getSegmentColor(3)}`} />
          {/* Segment 4 */}
          <div className={`h-full rounded-full transition-colors duration-300 ${getSegmentColor(4)}`} />
        </div>
      </div>

      {/* ─── Interactive Requirement Checklist ─── */}
      {showChecklist && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
          {checklistItems.map((item, idx) => (
            // Individual checklist row
            <div key={idx} className="flex items-center gap-1.5 text-[11px]">
              {item.met ? (
                // Green checkmark icon for satisfied rule
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              ) : (
                // Gray cross icon for unfulfilled rule
                <div className="w-3.5 h-3.5 rounded-full bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 flex items-center justify-center shrink-0">
                  <X className="w-2.5 h-2.5 stroke-[2]" />
                </div>
              )}
              {/* Rule text colored green if met, muted if unmet */}
              <span className={item.met ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-gray-500 dark:text-zinc-500"}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

