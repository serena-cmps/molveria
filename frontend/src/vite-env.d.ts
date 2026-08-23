/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend base URL. Falls back to localhost in lib/api.ts when unset, so local dev needs no .env file. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
