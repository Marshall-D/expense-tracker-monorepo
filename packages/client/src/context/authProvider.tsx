// packages/client/src/context/authProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  getToken,
  getUser,
  removeToken,
  removeUser,
  setToken as storageSetToken,
  setUser as storageSetUser,
  queryKeys,
} from "@/lib";
import { ROUTES } from "@/utils";
import { User, AuthContextValue } from "@/types";

/**
 * Create a context for auth state.
 * The initial value is undefined so hooks can require being inside a provider.
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * AuthProvider component
 * - manages `user` and `token` state
 * - synchronizes with localStorage (so other tabs can update)
 * - exposes setAuth() and logout() helpers to app
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // initialize state from storage helpers (lazy init)
  const [user, setUserState] = useState<User>(() => getUser());
  const [token, setTokenState] = useState<string | null>(() => getToken());

  // react-query client used to prime/invalidate caches on auth changes
  const qc = useQueryClient();

  useEffect(() => {
    // Listener to react when another tab changed localStorage.
    // It re-reads storage and rehydrates state in this tab.
    const onStorage = () => {
      setUserState(getUser());
      setTokenState(getToken());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /**
   * setAuth(u, t)
   * - sets in-memory user/token
   * - persists to localStorage (wrapped helpers)
   * - primes the "me" query and invalidates protected lists
   */
  const setAuth = (u: User, t: string) => {
    // update local React state
    setUserState(u);
    setTokenState(t);

    // persist to localStorage with helpers (wrapped in try to avoid throws)
    try {
      storageSetUser(u);
      storageSetToken(t);
    } catch {
      /* ignore storage errors (privacy mode etc.) */
    }

    // prime the `me` query so components reading queryKeys.me get immediate data
    try {
      qc.setQueryData(queryKeys.me, u);
    } catch {
      // ignore if query client not ready
    }

    // invalidate lists protected by auth so they are refetched under the new user
    try {
      qc.invalidateQueries({ queryKey: queryKeys.expenses });
      qc.invalidateQueries({ queryKey: queryKeys.budgets });
      qc.invalidateQueries({ queryKey: queryKeys.categories });
    } catch {
      // fail-safe: do not crash setAuth on qc errors
    }
  };

  /**
   * logout()
   * - clears in-memory auth
   * - removes persisted auth items
   * - clears react-query cache and redirects to login (hard replace)
   */
  const logout = () => {
    // 1) clear in-memory state
    setUserState(null);
    setTokenState(null);

    // 2) clear storage via helpers, plus a double-check using localStorage API
    try {
      removeToken();
      removeUser();
      try {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
      } catch {
        // ignore direct localStorage errors
      }
    } catch {
      /* ignore helper errors */
    }

    // 3) clear react-query cache so stale protected data is removed from UI
    try {
      qc.clear();
    } catch {
      /* ignore */
    }

    // 4) hard redirect to login to reset app state:
    //    use replace so the protected page is not in history
    try {
      window.location.replace(ROUTES.LOGIN);
    } catch {
      try {
        window.location.assign(ROUTES.LOGIN);
      } catch {
        // ignore if navigation fails (rare)
      }
    }
  };

  // Memoize context value so consumers re-render only when relevant values change
  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      setAuth,
      logout,
    }),
    [user, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * useAuth() hook
 * - convenience hook for components to access auth context
 * - throws if used outside provider to catch errors early.
 */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
