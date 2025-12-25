// packages/client/vite.config.mts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // "@/..." -> packages/client/src/...
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    fs: {
      // Allow Vite to serve files from the monorepo root/workspace,
      // required in some pnpm workspace setups. Adjust/remove if not needed.
      allow: [path.resolve(__dirname, "..", "..")],
    },
  },
});
