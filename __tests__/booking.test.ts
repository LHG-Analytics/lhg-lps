import { describe, it, expect } from "vitest";
import { buildBookingUrl } from "@/lib/booking";
import type { Brand } from "@/lib/schema";

const mockBrand: Brand = {
  id: "lush",
  name: "Lush Motel",
  domain: "lushmotel.com.br",
  favicon: "/brands/lush/favicon.png",
  logo: { src: "/brands/lush/logo.png", alt: "Lush" },
  fonts: {
    display: { family: "Fraunces", google: "Fraunces", fallback: "serif" },
    serif:   { family: "Fraunces", google: "Fraunces", fallback: "serif" },
    sans:    { family: "Inter",    google: "Inter",    fallback: "sans-serif" },
  },
  theme: {
    bg: "#0A1A10", bgElev: "#0F2014", bgCard: "#122518",
    line: "rgba(255,255,255,0.08)", lineSoft: "rgba(255,255,255,0.04)",
    ink: "#F0EEF8", inkMut: "#C4BFDE", inkDim: "#8E8AA8",
    lavender: "#C9A7F5", lavenderSoft: "#E5D4FC", lavenderDeep: "#9B6CE0",
    lavenderGrad: "linear-gradient(135deg,#C9A7F5,#9B6CE0)",
    green: "#5ABF86", greenDeep: "#2E9960",
    red: "#E05260", redDeep: "#C0384A",
    emerald: "#5ABF86", emeraldSoft: "#B5E5CC", emeraldDeep: "#2E9960",
    emeraldGrad: "linear-gradient(135deg,#5ABF86,#2E9960)",
    lavBright: "#CB98FF", inkDeep: "#0A1A10",
  },
  booking: {
    periodIds: { pernoite: "pernoite", "3h": "3horas" },
    urlTemplate: "https://lushmotel.com.br/pt-BR/{unit}/{categorySlug}/schedule?date={date}&period={periodId}",
  },
  units: [
    {
      id: "ipiranga",
      label: "Unidade 01",
      name: "Ipiranga",
      address: "R. Silva Bueno, 1",
      image: "/brands/lush/units/fachada-ipiranga.png",
      imageAlt: "Fachada Ipiranga",
      bookingBaseUrl: "https://lushmotel.com.br/pt-BR/ipiranga",
      categories: {
        all: [{ id: "splash", name: "Splash", meta: "spa + hidro", slug: "lush-spa-splash", amenities: [], hero: true }],
      },
    },
  ],
  concierge: { label: "Concierge 24h", href: "https://wa.me/5511999999999" },
};

describe("buildBookingUrl", () => {
  it("monta URL correta com todos os tokens", () => {
    const url = buildBookingUrl({
      brand: mockBrand,
      unitId: "ipiranga",
      categorySlug: "lush-spa-splash",
      date: "2026-06-14",
      periodKey: "pernoite",
    });
    expect(url).toBe(
      "https://lushmotel.com.br/pt-BR/ipiranga/lush-spa-splash/schedule?date=2026-06-14&period=pernoite"
    );
  });

  it("usa periodId correto para 3h", () => {
    const url = buildBookingUrl({
      brand: mockBrand,
      unitId: "ipiranga",
      categorySlug: "lush-spa-splash",
      date: "2026-06-14",
      periodKey: "3h",
    });
    expect(url).toContain("period=3horas");
  });

  it("retorna bookingBaseUrl se periodKey desconhecido", () => {
    const url = buildBookingUrl({
      brand: mockBrand,
      unitId: "ipiranga",
      categorySlug: "lush-spa-splash",
      date: "2026-06-14",
      periodKey: "desconhecido",
    });
    expect(url).toBe("https://lushmotel.com.br/pt-BR/ipiranga");
  });

  it("lança erro se unitId não existe na brand", () => {
    expect(() =>
      buildBookingUrl({
        brand: mockBrand,
        unitId: "inexistente",
        categorySlug: "lush-spa-splash",
        date: "2026-06-14",
        periodKey: "pernoite",
      })
    ).toThrow(/Unit "inexistente"/);
  });

  it("retorna bookingBaseUrl se categorySlug vazio", () => {
    const url = buildBookingUrl({
      brand: mockBrand,
      unitId: "ipiranga",
      categorySlug: "",
      date: "2026-06-14",
      periodKey: "pernoite",
    });
    expect(url).toBe("https://lushmotel.com.br/pt-BR/ipiranga");
  });

  it("retorna bookingBaseUrl se date vazio", () => {
    const url = buildBookingUrl({
      brand: mockBrand,
      unitId: "ipiranga",
      categorySlug: "lush-spa-splash",
      date: "",
      periodKey: "pernoite",
    });
    expect(url).toBe("https://lushmotel.com.br/pt-BR/ipiranga");
  });
});
