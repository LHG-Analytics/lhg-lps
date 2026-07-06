/**
 * Prefixa um path absoluto com `basePath` quando essa env está setada.
 *
 * `next/image` e `<Link>` aplicam o basePath automaticamente, mas elementos
 * crus como `<video>`, `<source>` e `<audio>` precisam de prefixo manual —
 * use este helper neles.
 *
 * Em dev local (sem basePath) é no-op.
 */
export function asset(path: string | undefined | null): string {
  if (!path) return "";
  // URLs absolutas (Vercel Blob, CDN externo) — sem alteração
  if (/^https?:\/\//.test(path)) return path;
  if (!path.startsWith("/")) return path;
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  // Em produção sem basePath (proxy Amplify/CloudFront), prefixa com a origin
  // da Vercel para que imagens de /public/ carreguem mesmo via proxy externo
  const origin = process.env.NEXT_PUBLIC_ASSET_ORIGIN ?? "";
  return `${origin}${base}${path}`;
}
