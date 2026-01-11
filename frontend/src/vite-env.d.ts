/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_MAPBOX_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Node.js timer types
type NodeJS_Timeout = ReturnType<typeof setTimeout>;
type NodeJS_Interval = ReturnType<typeof setInterval>;

declare global {
  namespace NodeJS {
    type Timeout = NodeJS_Timeout;
    type Timer = NodeJS_Timeout;
  }
}