/// <reference types="vite/client" />

// Optional: augment / narrow the Vite ImportMetaEnv
interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
