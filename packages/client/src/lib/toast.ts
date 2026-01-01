// packages/client/src/lib/toast.ts
import toast, { ToastOptions } from "react-hot-toast";

export const t = {
  success: (msg: string, opts?: ToastOptions) => toast.success(msg, opts),
  error: (msg: string, opts?: ToastOptions) => toast.error(msg, opts),
  loading: (msg = "Loading...", opts?: ToastOptions) =>
    toast.loading(msg, opts),
  dismiss: (id?: string) => toast.dismiss(id),
  // promise helper remains same shape
  promise: <T>(
    p: Promise<T>,
    msgs: { loading: string; success: string; error: string },
    opts?: ToastOptions
  ) =>
    toast.promise(
      p,
      {
        loading: msgs.loading,
        success: msgs.success,
        error: msgs.error,
      },
      opts
    ),
};
