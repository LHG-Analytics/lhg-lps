type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

/**
 * Rate limiter in-memory com janela deslizante simples.
 * Adequado para Serverless (cada instância tem seu próprio estado),
 * o que significa que os limites são por instância, não globais.
 * Para limites globais precisaria de Redis/Upstash — suficiente para
 * bloquear abusos óbvios em um único servidor.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}
