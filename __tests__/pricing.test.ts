import { describe, it, expect } from "vitest";
import { lookupPrice, formatBRL } from "@/lib/pricing";
import type { Campaign } from "@/lib/schema";

type Pricing = NonNullable<Campaign["campaign"]["pricing"]>;

const pricing: Pricing = {
  currency: "BRL",
  units: {
    ipiranga: {
      splash: {
        pernoite: { regular: 28900, premium: 34900 },
        "3horas":  { regular: 14500, premium: 17900 },
      },
      suite: {
        pernoite: { regular: 38900, premium: 44900 },
      },
    },
    lapa: {
      splash: {
        pernoite: { regular: 26900, premium: 31900 },
      },
    },
  },
};

describe("lookupPrice", () => {
  it("retorna preço regular corretamente", () => {
    expect(lookupPrice(pricing, { unitId: "ipiranga", categoryId: "splash", periodId: "pernoite", tier: "regular" }))
      .toBe(28900);
  });

  it("retorna preço premium corretamente", () => {
    expect(lookupPrice(pricing, { unitId: "ipiranga", categoryId: "splash", periodId: "pernoite", tier: "premium" }))
      .toBe(34900);
  });

  it("retorna preço para período 3h", () => {
    expect(lookupPrice(pricing, { unitId: "ipiranga", categoryId: "splash", periodId: "3horas", tier: "regular" }))
      .toBe(14500);
  });

  it("retorna undefined para unitId desconhecido", () => {
    expect(lookupPrice(pricing, { unitId: "inexistente", categoryId: "splash", periodId: "pernoite", tier: "regular" }))
      .toBeUndefined();
  });

  it("retorna undefined para categoryId desconhecido", () => {
    expect(lookupPrice(pricing, { unitId: "ipiranga", categoryId: "inexistente", periodId: "pernoite", tier: "regular" }))
      .toBeUndefined();
  });

  it("retorna undefined para periodId desconhecido", () => {
    expect(lookupPrice(pricing, { unitId: "ipiranga", categoryId: "splash", periodId: "inexistente", tier: "regular" }))
      .toBeUndefined();
  });

  it("retorna undefined se categoria não tem período 3h mas tem pernoite", () => {
    expect(lookupPrice(pricing, { unitId: "ipiranga", categoryId: "suite", periodId: "3horas", tier: "regular" }))
      .toBeUndefined();
  });

  it("retorna undefined se pricing é undefined", () => {
    expect(lookupPrice(undefined, { unitId: "ipiranga", categoryId: "splash", periodId: "pernoite", tier: "regular" }))
      .toBeUndefined();
  });
});

describe("formatBRL", () => {
  it("formata centavos para reais sem decimais", () => {
    expect(formatBRL(28900)).toBe("R$ 289");
  });

  it("arredonda corretamente (289,50 → R$290)", () => {
    expect(formatBRL(28950)).toBe("R$ 290");
  });

  it("arredonda para baixo (289,49 → R$289)", () => {
    expect(formatBRL(28949)).toBe("R$ 289");
  });

  it("formata zero", () => {
    expect(formatBRL(0)).toBe("R$ 0");
  });

  it("formata valor grande com separador de milhar", () => {
    const result = formatBRL(1000000);
    expect(result).toContain("10.000");
  });
});
