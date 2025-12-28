// packages/client/src/hooks/useLogin.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginApi } from "@/services/authService";
import { useAuth } from "@/context/authProvider";
import type { LoginPayload, AuthResponse } from "@/types/auth";
import { queryKeys } from "@/lib/queryKeys";

/**
 * useLogin
 * - mutationFn: loginApi
 * - onSuccess: store auth in context/localStorage and prime/invalidates queries
 *
 * Returns the useMutation result so components can access mutateAsync/isLoading/etc.
 */
export function useLogin() {
  const qc = useQueryClient();
  const { setAuth } = useAuth();

  return useMutation<AuthResponse, Error, LoginPayload>({
    mutationFn: (payload: LoginPayload) => loginApi(payload),
    onSuccess(data) {
      setAuth(data.user, data.token);
      // prime `me`
      qc.setQueryData(queryKeys.me, data.user);
      // invalidate lists that depend on auth
      qc.invalidateQueries({ queryKey: queryKeys.expenses });
      qc.invalidateQueries({ queryKey: queryKeys.budgets });
      qc.invalidateQueries({ queryKey: queryKeys.categories });
    },
  });
}
