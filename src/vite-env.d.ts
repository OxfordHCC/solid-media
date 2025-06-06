/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly HOMEPAGE: string
  readonly VITE_TMDB_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
