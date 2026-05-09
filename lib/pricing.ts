import type { Campaign } from "@/lib/schema";

type Pricing = NonNullable<Campaign["campaign"]["pricing"]>;
type Tier = "regular" | "premium";

export type PriceLookupKey = {
  unitId: string;
  categoryId: string;
  periodId: string;
  tier: Tier;
};

/**
 * Devolve o preço em centavos para uma combinação específica
 * (unit, category, period, tier), ou `undefined` se a tabela não
 * cobrir essa entrada.
 *
 * O wizard usa este mesmo lookup para filtrar categorias indisponíveis
 * em `UnitPicker.tsx` — manter a lógica centralizada aqui evita
 * que componentes diferentes interpretem "sem preço" de jeitos
 * diferentes.
 */
export function lookupPrice(
  pricing: Pricing | undefined,
  key: PriceLookupKey
): number | undefined {
  if (!pricing) return undefined;
  const unit = pricing.units[key.unitId];
  if (!unit) return undefined;
  const category = unit[key.categoryId];
  if (!category) return undefined;
  const period = category[key.periodId];
  if (!period) return undefined;
  return period[key.tier];
}

/**
 * Centavos → string formatada em BRL ("R$ 1.542,25").
 * Usa `Intl.NumberFormat` em pt-BR pra obter os separadores
 * brasileiros (ponto pra milhar, vírgula pra decimal).
 */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
