"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_label: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_COLOR: Record<string, string> = {
  publish:            "#2EB87A",
  save_draft:         "#8E8AA8",
  create_campaign:    "#A67CFF",
  duplicate_campaign: "#A67CFF",
  update_brand:       "#F0A84A",
};

const ACTION_ICON: Record<string, string> = {
  publish:            "🚀",
  save_draft:         "💾",
  create_campaign:    "✨",
  duplicate_campaign: "⎘",
  update_brand:       "🏷",
};

const PAGE_SIZE = 50;

const fld: React.CSSProperties = {
  background: "#16161F", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6, padding: "6px 10px", color: "#F0EEF8", fontSize: 12,
  outline: "none", fontFamily: "inherit",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function AuditPage() {
  const [logs,     setLogs]     = useState<AuditLog[]>([]);
  const [total,    setTotal]    = useState(0);
  const [offset,   setOffset]   = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [entity,   setEntity]   = useState("");
  const [action,   setAction]   = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (off: number, ent: string, act: string) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(off) });
      if (ent) params.set("entity", ent);
      if (act) params.set("action", act);
      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { logs: AuditLog[]; total: number };
      setLogs(data.logs);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar logs");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(0, entity, action); }, [load, entity, action]);

  function prevPage() {
    const off = Math.max(0, offset - PAGE_SIZE);
    setOffset(off); void load(off, entity, action);
  }
  function nextPage() {
    const off = offset + PAGE_SIZE;
    setOffset(off); void load(off, entity, action);
  }

  const pages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div style={{ minHeight: "100dvh", background: "#0D0D12", padding: "0 0 48px" }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/admin" style={{ color: "#55526A", fontSize: 12, textDecoration: "none" }}>← Admin</Link>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#F0EEF8" }}>Log de auditoria</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "#55526A" }}>{total} registros</span>
      </div>

      {/* Filters */}
      <div style={{ padding: "14px 24px", display: "flex", gap: 10, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <select value={entity} onChange={(e) => { setEntity(e.target.value); setOffset(0); }} style={{ ...fld, cursor: "pointer" }}>
          <option value="">Todos os tipos</option>
          <option value="campaign">Campanhas</option>
          <option value="brand">Marcas</option>
        </select>
        <select value={action} onChange={(e) => { setAction(e.target.value); setOffset(0); }} style={{ ...fld, cursor: "pointer" }}>
          <option value="">Todas as ações</option>
          <option value="publish">Publicar</option>
          <option value="save_draft">Salvar rascunho</option>
          <option value="create_campaign">Criar campanha</option>
          <option value="duplicate_campaign">Duplicar campanha</option>
          <option value="update_brand">Editar marca</option>
        </select>
        {(entity || action) && (
          <button
            onClick={() => { setEntity(""); setAction(""); setOffset(0); }}
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 12px", color: "#8E8AA8", fontSize: 11, cursor: "pointer" }}
          >Limpar filtros</button>
        )}
      </div>

      {/* Table */}
      <div style={{ padding: "0 24px" }}>
        {loading && (
          <div style={{ textAlign: "center", color: "#55526A", fontSize: 13, padding: 32 }}>Carregando…</div>
        )}
        {error && (
          <div style={{ fontSize: 12, color: "#E05260", padding: "12px 0" }}>{error}</div>
        )}
        {!loading && logs.length === 0 && !error && (
          <div style={{ textAlign: "center", color: "#55526A", fontSize: 13, padding: 32 }}>Nenhum registro encontrado.</div>
        )}
        {!loading && logs.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Data", "Usuário", "Ação", "Entidade", "Label"].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#55526A" }}>{h}</th>
                ))}
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: log.details ? "pointer" : "default" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                  >
                    <td style={{ padding: "10px 12px", fontSize: 11, color: "#8E8AA8", whiteSpace: "nowrap" }}>
                      {formatDate(log.created_at)}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 11, color: "#8E8AA8", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.user_email ?? log.user_id ?? "—"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600,
                        color: ACTION_COLOR[log.action] ?? "#8E8AA8",
                        background: `${ACTION_COLOR[log.action] ?? "#8E8AA8"}18`,
                        padding: "3px 9px", borderRadius: 99,
                      }}>
                        {ACTION_ICON[log.action] ?? "•"} {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 11, color: "#55526A" }}>
                      {log.entity_type}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 11, color: "#F0EEF8", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.entity_label ?? log.entity_id}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, color: "#3A3850" }}>
                      {log.details && <span>{expanded === log.id ? "▲" : "▼"}</span>}
                    </td>
                  </tr>
                  {expanded === log.id && log.details && (
                    <tr key={`${log.id}-detail`} style={{ background: "rgba(166,124,255,0.04)" }}>
                      <td colSpan={6} style={{ padding: "8px 24px 12px" }}>
                        <pre style={{
                          fontSize: 11, color: "#A67CFF", fontFamily: "monospace",
                          background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "10px 14px",
                          margin: 0, overflow: "auto", maxHeight: 200,
                          border: "1px solid rgba(166,124,255,0.12)",
                        }}>
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", justifyContent: "flex-end" }}>
          <button onClick={prevPage} disabled={offset === 0} style={{
            background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
            padding: "6px 14px", color: offset === 0 ? "#3A3850" : "#8E8AA8",
            fontSize: 12, cursor: offset === 0 ? "default" : "pointer",
          }}>← Anterior</button>
          <span style={{ fontSize: 12, color: "#55526A" }}>Página {currentPage} de {pages}</span>
          <button onClick={nextPage} disabled={offset + PAGE_SIZE >= total} style={{
            background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
            padding: "6px 14px", color: offset + PAGE_SIZE >= total ? "#3A3850" : "#8E8AA8",
            fontSize: 12, cursor: offset + PAGE_SIZE >= total ? "default" : "pointer",
          }}>Próxima →</button>
        </div>
      )}
    </div>
  );
}
