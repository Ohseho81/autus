/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLAUDE_API_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ENABLE_AI_ASSIST: string;
  readonly VITE_ENABLE_AUTO_CLASSIFY: string;
  readonly VITE_ENABLE_RISK_SCORING: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
