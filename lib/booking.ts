import type { Brand } from "@/lib/schema";

export type BuildBookingUrlInput = {
  brand: Brand;
  unitId: string;
  categorySlug: string;
  date: string;
  periodKey: string;
};

/**
 * Monta a URL final de checkout interpolando `brand.booking.urlTemplate`.
 *
 * Tokens reconhecidos no template:
 *   {unit}          → unitId
 *   {categorySlug}  → categorySlug
 *   {date}          → date (YYYY-MM-DD)
 *   {periodId}      → brand.booking.periodIds[periodKey]
 *
 * Se algum token essencial não puder ser resolvido (categorySlug ou date
 * ausentes, ou periodKey desconhecido), devolve o fallback institucional
 * baseado em `unit.bookingBaseUrl`.
 */
export function buildBookingUrl(input: BuildBookingUrlInput): string {
  const { brand, unitId, categorySlug, date, periodKey } = input;

  const periodId = brand.booking.periodIds[periodKey];
  const unit = brand.units.find((u) => u.id === unitId);
  if (!unit) {
    throw new Error(`Unit "${unitId}" not in brand "${brand.id}"`);
  }

  if (!categorySlug || !date || !periodId) {
    return unit.bookingBaseUrl;
  }

  return brand.booking.urlTemplate
    .replace("{unit}", unitId)
    .replace("{categorySlug}", categorySlug)
    .replace("{date}", date)
    .replace("{periodId}", periodId);
}
