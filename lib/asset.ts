/**
 * Prefixa um path absoluto com `basePath` quando essa env está setada.
 *
 * `next/image` e `<Link>` aplicam o basePath automaticamente, mas elementos
 * crus como `<video>`, `<source>` e `<audio>` precisam de prefixo manual —
 * use este helper neles.
 *
 * Em dev local (sem basePath) é no-op.
 */
export function asset(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (!base) return path;
  if (!path.startsWith("/")) return path;
  return `${base}${path}`;
}
