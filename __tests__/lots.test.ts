import { describe, it, expect } from "vitest";
import { getActiveLot } from "@/lib/lots";
import type { Lot } from "@/lib/schema";

const d = (dateStr: string) => new Date(dateStr + "T12:00:00");

describe("getActiveLot", () => {
  const lots: Lot[] = [
    { id: "l1", name: "Lote 1 – 25% OFF", discountPct: 25, coupon: "PROMO25", from: "2026-06-01", to: "2026-06-07" },
    { id: "l2", name: "Lote 2 – 15% OFF", discountPct: 15, coupon: "PROMO15", from: "2026-06-08", to: "2026-06-13" },
    { id: "l3", name: "Lote encerrado",   discountPct: 0,  after: "2026-06-13" },
  ];

  it("retorna lote 1 dentro do range from/to", () => {
    const result = getActiveLot(d("2026-06-03"), lots);
    expect(result.name).toBe("Lote 1 – 25% OFF");
    expect(result.discountPct).toBe(25);
    expect(result.coupon).toBe("PROMO25");
  });

  it("retorna lote 1 no primeiro dia (from inclusivo)", () => {
    const result = getActiveLot(d("2026-06-01"), lots);
    expect(result.name).toBe("Lote 1 – 25% OFF");
  });

  it("retorna lote 1 no último dia (to inclusivo)", () => {
    const result = getActiveLot(d("2026-06-07"), lots);
    expect(result.name).toBe("Lote 1 – 25% OFF");
  });

  it("retorna lote 2 após transição", () => {
    const result = getActiveLot(d("2026-06-08"), lots);
    expect(result.name).toBe("Lote 2 – 15% OFF");
  });

  it("retorna lote 'encerrado' com after", () => {
    const result = getActiveLot(d("2026-06-15"), lots);
    expect(result.name).toBe("Lote encerrado");
    expect(result.discountPct).toBe(0);
    expect(result.coupon).toBeUndefined();
  });

  it("retorna fallback vazio se nenhum lote é ativo", () => {
    const result = getActiveLot(d("2025-01-01"), lots);
    expect(result.name).toBe("—");
    expect(result.discountPct).toBe(0);
  });

  it("respeita order: primeiro lote matching vence", () => {
    // Dois lotes com o mesmo range — o primeiro deve vencer
    const overlapping: Lot[] = [
      { id: "a", name: "Primeiro", discountPct: 10, from: "2026-06-01", to: "2026-06-10" },
      { id: "b", name: "Segundo",  discountPct: 20, from: "2026-06-01", to: "2026-06-10" },
    ];
    const result = getActiveLot(d("2026-06-05"), overlapping);
    expect(result.name).toBe("Primeiro");
  });

  it("lote com before retorna ativo antes da data", () => {
    const earlyLots: Lot[] = [
      { id: "x", name: "Abertura", discountPct: 30, coupon: "EARLY30", before: "2026-07-01" },
    ];
    expect(getActiveLot(d("2026-06-30"), earlyLots).name).toBe("Abertura");
    expect(getActiveLot(d("2026-07-01"), earlyLots).name).toBe("—");
  });
});
