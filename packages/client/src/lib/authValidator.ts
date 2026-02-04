// packages/client/src/lib/authValidator.ts

/**
 * Small client-side validators used in forms (login/register)
 * Return a stable shape so UI can display messages.
 */

export type ValidationResult = { ok: true } | { ok: false; error: string };

/**
 * validateEmail:
 * - basic client-side email check: non-empty + simple regex
 * - sufficient for UX validation; server still validates fully
 */
export function validateEmail(email?: string): ValidationResult {
  if (!email || typeof email !== "string" || email.trim() === "") {
    return { ok: false, error: "Email is required." };
  }
  // conservative regex for typical addresses
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email.trim())) {
    return { ok: false, error: "Enter a valid email address." };
  }
  return { ok: true };
}

/**
 * validatePassword:
 * - require at least 8 characters (client-side rule)
 */
export function validatePassword(password?: string): ValidationResult {
  if (!password || typeof password !== "string" || password.length === 0) {
    return { ok: false, error: "Password is required." };
  }
  if (password.length < 8) {
    return {
      ok: false,
      error: "Password must be at least 8 characters long.",
    };
  }
  return { ok: true };
}

/**
 * validateName:
 * - minimal name check: required and at least 2 characters
 */
export function validateName(name?: string): ValidationResult {
  if (!name || typeof name !== "string" || name.trim() === "") {
    return { ok: false, error: "Full name is required." };
  }
  if (name.trim().length < 2) {
    return { ok: false, error: "Please enter a valid full name." };
  }
  return { ok: true };
}
