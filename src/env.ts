function ensureEndingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

export const BASE_URL = ensureEndingSlash(import.meta.env.BASE_URL) || '/';
