// packages/client/src/hooks/useLogin.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginApi } from "@/services";
import { useAuth } from "@/context";
import type { LoginPayload, AuthResponse } from "@/types";
import { queryKeys, t } from "@/lib";

/**
 * useLogin
 * - mutation that calls loginApi
 * - onSuccess: set auth in context + prime caches + success toast
 */
export function useLogin() {
  const qc = useQueryClient();
  const { setAuth } = useAuth();

  return useMutation<AuthResponse, Error, LoginPayload>({
    mutationFn: (payload: LoginPayload) => loginApi(payload),
    onSuccess(data) {
      setAuth(data.user, data.token);
      qc.setQueryData(queryKeys.me, data.user);
      qc.invalidateQueries({ queryKey: queryKeys.expenses });
      qc.invalidateQueries({ queryKey: queryKeys.budgets });
      qc.invalidateQueries({ queryKey: queryKeys.categories });
      t.success("Signed in successfully");
    },
    onError(err: any) {},
  });
}
