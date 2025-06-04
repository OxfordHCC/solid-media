/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly HOMEPAGE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
