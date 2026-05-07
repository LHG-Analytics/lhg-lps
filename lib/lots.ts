import type { Lot } from "@/lib/schema";

export type ActiveLot = {
  name: string;
  discountPct: number;
  /** Código de cupom (se houver). Ausente em lotes encerrados. */
  coupon?: string;
};

/**
 * Resolve o lote ativo para `today` consultando o array de `lots`.
 *
 * Cada lote pode definir uma janela de validade com qualquer combinação de:
 *   - from + to     : inclusivo nas duas pontas
 *   - before        : ativo enquanto today < before
 *   - after         : ativo quando today > after
 *
 * O primeiro lote cuja janela inclui `today` vence — a ordem do array é
 * autoritativa, então o JSON deve ir do mais específico ao mais genérico
 * (ex.: ranges promocionais primeiro, fallbacks de "abre em" / "encerrado"
 * depois).
 */
export function getActiveLot(today: Date, lots: readonly Lot[]): ActiveLot {
  const ts = today.getTime();
  for (const lot of lots) {
    if (matches(ts, lot)) {
      return {
        name: lot.name,
        discountPct: lot.discountPct,
        coupon: lot.coupon,
      };
    }
  }
  return { name: "—", discountPct: 0 };
}

function matches(ts: number, lot: Lot): boolean {
  if (lot.from && lot.to) {
    const from = parseISO(lot.from);
    const to = parseISO(lot.to, /* endOfDay */ true);
    return ts >= from && ts <= to;
  }
  if (lot.before) {
    return ts < parseISO(lot.before);
  }
  if (lot.after) {
    return ts > parseISO(lot.after, /* endOfDay */ true);
  }
  return false;
}

function parseISO(date: string, endOfDay = false): number {
  // ISO date `YYYY-MM-DD` é interpretada como UTC pelo Date constructor.
  // Para janelas de campanha em SP, basta truncar/anexar o offset do dia.
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return Number.NaN;
  return endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999).getTime()
    : new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}
