"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

const PAGE_SIZE = 20;

interface Props {
  brands: string[];
  total: number;
  page: number;
}

export function CampaignFilters({ brands, total, page }: Props) {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const push = useCallback((updates: Record<string, string | null>) => {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") p.delete(k);
      else p.set(k, v);
    }
    if (updates.q !== undefined || updates.brand !== undefined || updates.status !== undefined) {
      p.delete("page");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startTransition(() => router.push(`${pathname}?${p.toString()}` as any));
  }, [router, pathname, searchParams]);

  const q       = searchParams.get("q") ?? "";
  const brand   = searchParams.get("brand") ?? "";
  const status  = searchParams.get("status") ?? "";
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const inp: React.CSSProperties = {
    background: "#16161F", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6, padding: "7px 10px", color: "#F0EEF8", fontSize: 13,
    outline: "none", fontFamily: "inherit",
  };

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...inp, width: 220 }}
          placeholder="Buscar por slug ou marca…"
          defaultValue={q}
          onChange={(e) => push({ q: e.target.value })}
        />

        <select
          style={{ ...inp, cursor: "pointer" }}
          value={brand}
          onChange={(e) => push({ brand: e.target.value })}
        >
          <option value="">Todas as marcas</option>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>

        <select
          style={{ ...inp, cursor: "pointer" }}
          value={status}
          onChange={(e) => push({ status: e.target.value })}
        >
          <option value="">Todos os status</option>
          <option value="draft">draft</option>
          <option value="published">published</option>
          <option value="archived">archived</option>
        </select>

        {(q || brand || status) && (
          <button
            onClick={() => push({ q: null, brand: null, status: null })}
            style={{ background: "none", border: "none", color: "#55526A", fontSize: 12, cursor: "pointer", padding: "4px 8px" }}
          >
            ✕ Limpar filtros
          </button>
        )}

        {pending && <span style={{ fontSize: 11, color: "#55526A" }}>…</span>}

        <span style={{ marginLeft: "auto", fontSize: 11, color: "#55526A" }}>
          {total} campanha{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 16, justifyContent: "center" }}>
          <PageBtn
            label="←"
            disabled={page <= 1}
            onClick={() => push({ page: String(page - 1) })}
          />
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <PageBtn
              key={p}
              label={String(p)}
              active={p === page}
              onClick={() => push({ page: String(p) })}
            />
          ))}
          <PageBtn
            label="→"
            disabled={page >= totalPages}
            onClick={() => push({ page: String(page + 1) })}
          />
        </div>
      )}
    </div>
  );
}

function PageBtn({ label, active, disabled, onClick }: {
  label: string; active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 30, height: 30, borderRadius: 6, border: `1px solid ${active ? "rgba(166,124,255,0.5)" : "rgba(255,255,255,0.08)"}`,
        background: active ? "rgba(166,124,255,0.15)" : "transparent",
        color: disabled ? "#2A2838" : active ? "#A67CFF" : "#8E8AA8",
        fontSize: 12, fontWeight: active ? 700 : 400,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  );
}
