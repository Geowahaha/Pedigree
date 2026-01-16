/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_INVITE_REDIRECT_URL?: string
    readonly VITE_N8N_WEBHOOK_URL?: string
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
