// packages/client/src/lib/api.ts
/**
 * Lightweight axios wrapper used across the app.
 * - Adds Authorization header when a token exists
 * - Global 401 handling: clear storage and redirect to login (unless calling auth endpoints)
 */

import axios from "axios";

import { getToken, removeToken, removeUser } from "./storage";
import { ROUTES } from "@/utils";

const API_BASE = import.meta.env.VITE_API_BASE as string;

// axios instance configured for JSON APIs
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  withCredentials: false, // we use Bearer tokens, not cookies
});

// Request interceptor: attach Authorization header if token present
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: globally handle 401 Unauthorized
api.interceptors.response.use(
  (res) => res, // pass through success
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      // Clear stored auth info immediately
      removeToken();
      removeUser();

      try {
        // Figure out request url to avoid redirecting on auth endpoints
        const reqUrl =
          (err && err.config && (err.config.url || err.config.baseURL || "")) ||
          "";

        const isAuthEndpoint =
          String(reqUrl).includes("/api/auth") ||
          String(reqUrl).includes("/auth") ||
          false;

        const alreadyOnLogin =
          typeof window !== "undefined" &&
          window.location &&
          window.location.pathname === ROUTES.LOGIN;

        // Only redirect when it's not an auth endpoint and we're not already on login
        if (!isAuthEndpoint && !alreadyOnLogin) {
          try {
            window.location.replace(ROUTES.LOGIN);
          } catch {
            try {
              window.location.href = ROUTES.LOGIN;
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        /* swallow errors during global 401 cleanup */
      }
    }
    return Promise.reject(err);
  },
);

export { api };
