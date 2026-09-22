/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_SECRET_PATH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
