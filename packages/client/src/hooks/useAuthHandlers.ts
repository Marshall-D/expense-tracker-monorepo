// packages/client/src/hooks/useAuthHandlers.ts
/**
 * Hooks used by Login/Register forms.
 * - Validates inputs on the client
 * - Calls server mutations (useLogin / useRegister)
 * - Shows inline form errors and toast messages
 * - Focuses the relevant input on error
 */

import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useLogin } from "./useLogin";
import { useRegister } from "./useRegister";
import { ROUTES } from "@/utils";
import { validateEmail, validatePassword, validateName, t } from "@/lib";

type LoginFormShape = { email: string; password: string };
type RegisterFormShape = { name: string; email: string; password: string };

/**
 * useLoginHandler
 * - wraps useLogin() mutation with client validation + UX behavior
 */
export function useLoginHandler() {
  const navigate = useNavigate(); // navigate on success
  const mutation = useLogin(); // react-query mutation
  const { mutateAsync } = mutation;
  const isLoading = mutation.status === "pending"; // loading state
  const [formError, setFormError] = useState<string | null>(null); // inline form error

  // small helper to focus/select a DOM input by id (safe for SSR)
  const focusField = useCallback((id: string) => {
    try {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.select?.();
      }
    } catch {
      /* ignore errors */
    }
  }, []);

  // submit handler used by the login form element
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setFormError(null);

      // read values from form
      const form = new FormData(e.currentTarget);
      const email = String(form.get("email") || "").trim();
      const password = String(form.get("password") || "");

      // client-side email validation
      const emailV = validateEmail(email);
      if (!emailV.ok) {
        setFormError(emailV.error);
        t.error(emailV.error, { duration: 8000 });
        focusField("email");
        return;
      }

      // client-side password validation
      const passV = validatePassword(password);
      if (!passV.ok) {
        setFormError(passV.error);
        t.error(passV.error, { duration: 8000 });
        focusField("password");
        return;
      }

      // call server
      try {
        await mutateAsync({ email, password } as LoginFormShape);
        navigate(ROUTES.DASHBOARD); // on success redirect
      } catch (err: any) {
        // normalize server error for display
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Login failed";
        setFormError(msg);
        t.error(msg, { duration: 8000 });
        focusField("email");
      }
    },
    [mutateAsync, navigate, focusField],
  );

  return { handleSubmit, isLoading, formError, focusField };
}

/**
 * useRegisterHandler
 * - mirrors login handler but uses useRegister + name validation
 */
export function useRegisterHandler() {
  const navigate = useNavigate();
  const mutation = useRegister();
  const { mutateAsync } = mutation;
  const isLoading = mutation.status === "pending";
  const [formError, setFormError] = useState<string | null>(null);

  const focusField = useCallback((id: string) => {
    try {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.select?.();
      }
    } catch {}
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setFormError(null);

      const form = new FormData(e.currentTarget);
      const name = String(form.get("name") || "").trim();
      const email = String(form.get("email") || "").trim();
      const password = String(form.get("password") || "");

      // client-side name/email/password validation
      const nameV = validateName(name);
      if (!nameV.ok) {
        setFormError(nameV.error);
        t.error(nameV.error, { duration: 8000 });
        focusField("name");
        return;
      }

      const emailV = validateEmail(email);
      if (!emailV.ok) {
        setFormError(emailV.error);
        t.error(emailV.error, { duration: 8000 });
        focusField("email");
        return;
      }

      const passV = validatePassword(password);
      if (!passV.ok) {
        setFormError(passV.error);
        t.error(passV.error, { duration: 8000 });
        focusField("password");
        return;
      }

      try {
        await mutateAsync({ name, email, password } as RegisterFormShape);
        navigate(ROUTES.DASHBOARD);
      } catch (err: any) {
        const msg =
          err?.response?.data?.message || err?.message || "Registration failed";
        setFormError(msg);
        t.error(msg, { duration: 8000 });
        focusField("email");
      }
    },
    [mutateAsync, navigate, focusField],
  );

  return { handleSubmit, isLoading, formError, focusField };
}
